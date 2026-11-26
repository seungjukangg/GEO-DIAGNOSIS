/**
 * GEO 진단 사이트 서버 (Express + Vite)
 * - POST /api/video-diagnose : 영상 파일 또는 YouTube URL → Gemini 분석 → 점수 계산 후 반환
 * - API 키는 코드에 적지 않음. AI Studio가 넣어 주는 환경변수 GEMINI_API_KEY를 사용
 */
import express from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { GoogleGenAI, Type, createPartFromUri } from '@google/genai';
import { buildPrompt, postProcess, DiagnoseInput, Platform, RawResult } from './src/geoCriteria';

const PORT = Number(process.env.PORT) || 3000;
const MODEL = process.env.GEMINI_MODEL || 'gemini-4-hydrogen'; // 모델명이 바뀌면 여기만 수정
const MOCK = process.env.MOCK_GEMINI === '1'; // 1이면 Gemini를 호출하지 않고 예시 결과 반환 (화면 확인용)

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
});

/* ---------- Gemini 응답 형식 (JSON 고정) ---------- */
const str = { type: Type.STRING };
const int = { type: Type.INTEGER };
const evidence = { type: Type.OBJECT, properties: { time: str, quote: str }, required: ['time', 'quote'] };

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    transcript: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { start: str, source: { type: Type.STRING, enum: ['나레이션', '화면자막', '둘다'] }, text: str },
        required: ['start', 'source', 'text'],
      },
    },
    hook: {
      type: Type.OBJECT,
      properties: {
        timeRange: str,
        text: str,
        problems: { type: Type.ARRAY, items: str },
        improved: {
          type: Type.ARRAY,
          items: { type: Type.OBJECT, properties: { text: str, whatChanged: str }, required: ['text', 'whatChanged'] },
        },
      },
      required: ['timeRange', 'text', 'problems', 'improved'],
    },
    criteria: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { code: str, score: int, evidence: { type: Type.ARRAY, items: evidence }, reason: str, fix: str },
        required: ['code', 'score', 'evidence', 'reason', 'fix'],
      },
    },
    questionCoverage: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { question: str, score: int, time: str, note: str },
        required: ['question', 'score', 'time', 'note'],
      },
    },
    kbfCoverage: {
      type: Type.ARRAY,
      items: { type: Type.OBJECT, properties: { kbf: str, score: int, note: str }, required: ['kbf', 'score', 'note'] },
    },
    rewrites: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { time: str, original: str, issues: { type: Type.ARRAY, items: str }, rewritten: str },
        required: ['time', 'original', 'issues', 'rewritten'],
      },
    },
    textPackage: {
      type: Type.OBJECT,
      properties: {
        title: str,
        descriptionLead: str,
        chapters: {
          type: Type.ARRAY,
          items: { type: Type.OBJECT, properties: { time: str, title: str }, required: ['time', 'title'] },
        },
        faq: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { q: str, a: str }, required: ['q', 'a'] } },
      },
      required: ['title', 'descriptionLead', 'chapters', 'faq'],
    },
  },
  required: ['transcript', 'hook', 'criteria', 'questionCoverage', 'kbfCoverage', 'rewrites', 'textPackage'],
};

/* ---------- 입력값 정리 ---------- */
const PLATFORMS: Platform[] = ['youtube_long', 'youtube_shorts', 'reels', 'tiktok', 'other'];
const lines = (v: unknown) =>
  String(v ?? '')
    .split(/\n|,/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);

function readInput(body: Record<string, unknown>): DiagnoseInput {
  const platform = PLATFORMS.includes(body.platform as Platform) ? (body.platform as Platform) : 'other';
  return {
    brand: String(body.brand ?? '').trim(),
    product: String(body.product ?? '').trim(),
    category: String(body.category ?? '').trim(),
    questions: lines(body.questions),
    kbfs: lines(body.kbfs),
    platform,
  };
}

/* ---------- Gemini 호출 ---------- */
async function analyzeWithGemini(input: DiagnoseInput, file?: Express.Multer.File, youtubeUrl?: string): Promise<RawResult> {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY 환경변수가 없습니다.');
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  let uploadedName: string | undefined;
  try {
    let videoPart;
    if (file) {
      // 1) Gemini Files API에 업로드 → 2) 처리 완료(ACTIVE)까지 대기
      let uploaded = await ai.files.upload({ file: file.path, config: { mimeType: file.mimetype } });
      uploadedName = uploaded.name;
      const started = Date.now();
      while (String(uploaded.state) === 'PROCESSING') {
        if (Date.now() - started > 180_000) throw new Error('영상 처리 시간이 3분을 넘었습니다.');
        await new Promise((r) => setTimeout(r, 4000));
        uploaded = await ai.files.get({ name: uploaded.name! });
      }
      if (String(uploaded.state) === 'FAILED') throw new Error('Gemini가 영상을 처리하지 못했습니다.');
      videoPart = createPartFromUri(uploaded.uri!, uploaded.mimeType!);
    } else {
      videoPart = { fileData: { fileUri: youtubeUrl! } }; // 공개 YouTube 영상만 가능
    }

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [videoPart, { text: buildPrompt(input) }] }],
      config: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA },
    });
    return JSON.parse(response.text ?? '{}') as RawResult;
  } finally {
    // 업로드한 영상은 분석 후 바로 삭제
    if (uploadedName) await ai.files.delete({ name: uploadedName }).catch(() => {});
  }
}

/* ---------- 서버 ---------- */
async function main() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/video-diagnose', upload.single('video'), async (req, res) => {
    const file = req.file;
    try {
      const input = readInput(req.body ?? {});
      const youtubeUrl = String(req.body?.youtubeUrl ?? '').trim();
      if (!file && !/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(youtubeUrl)) {
        return res.status(400).json({ error: '영상 파일을 올리거나 YouTube 주소를 입력하세요.' });
      }
      if (file && !file.mimetype.startsWith('video/')) {
        return res.status(400).json({ error: '영상 파일만 올릴 수 있습니다.' });
      }

      const raw = MOCK ? (await import('./src/mockResult')).MOCK_RAW : await analyzeWithGemini(input, file, youtubeUrl);
      res.json(postProcess(raw, input, MOCK ? 'mock' : MODEL));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.' });
    } finally {
      if (file) await fs.unlink(file.path).catch(() => {});
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(process.cwd(), 'dist');
    app.use(express.static(dist));
    app.use((_req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => console.log(`GEO 진단 서버 실행: http://localhost:${PORT} (model: ${MOCK ? 'mock' : MODEL})`));
}

main();
