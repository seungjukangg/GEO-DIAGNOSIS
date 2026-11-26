export type Platform = 'youtube_long' | 'youtube_shorts' | 'reels' | 'tiktok' | 'other';

export interface DiagnoseInput {
  brand: string;
  product: string;
  category: string;
  questions: string[];
  kbfs: string[];
  platform: Platform;
}

export interface TranscriptSegment {
  start: string;
  source: '나레이션' | '화면자막' | '둘다';
  text: string;
}

export interface HookImprovement {
  text: string;
  whatChanged: string;
}

export interface HookAnalysis {
  timeRange: string;
  text: string;
  problems: string[];
  improved: HookImprovement[];
}

export interface EvidenceItem {
  time: string;
  quote: string;
}

export interface CriterionRaw {
  code: string;
  score: number;
  evidence: EvidenceItem[];
  reason: string;
  fix: string;
}

export interface QuestionCoverageItem {
  question: string;
  score: number;
  time: string;
  note: string;
}

export interface KbfCoverageItem {
  kbf: string;
  score: number;
  note: string;
}

export interface RewriteItem {
  time: string;
  original: string;
  issues: string[];
  rewritten: string;
}

export interface TextPackage {
  title: string;
  descriptionLead: string;
  chapters: { time: string; title: string }[];
  faq: { q: string; a: string }[];
}

export interface RawResult {
  transcript: TranscriptSegment[];
  hook: HookAnalysis;
  criteria: CriterionRaw[];
  questionCoverage: QuestionCoverageItem[];
  kbfCoverage: KbfCoverageItem[];
  rewrites: RewriteItem[];
  textPackage: TextPackage;
}

export interface CriterionSpec {
  code: string;
  name: string;
  description: string;
  weight: number;
}

export const GEO_CRITERIA: CriterionSpec[] = [
  {
    code: 'C1',
    name: '엔티티·브랜드 식별 명확성',
    description: '브랜드명, 제품명, 카테고리가 초반 구간부터 음성 발화와 화면 자막에 정확히 등장하는지 평가합니다.',
    weight: 0.2,
  },
  {
    code: 'C2',
    name: '핵심 질문 직접 응답성',
    description: '사용자가 AI 검색에 입력하는 핵심 질문에 대해 모호함 없이 두괄식으로 직접 답하는지 평가합니다.',
    weight: 0.25,
  },
  {
    code: 'C3',
    name: 'KBF·수치 기반 근거 구체성',
    description: '주요 구매 요인(KBF), 객관적 수치, 비교 기준, 사용 환경 등 AI가 인용 가능한 사실적 근거를 평가합니다.',
    weight: 0.2,
  },
  {
    code: 'C4',
    name: '나레이션·화면자막 정합성 및 구조화',
    description: '음성 설명과 화면 자막이 일관되며 단락 전환과 요약 구조가 명확한지 평가합니다.',
    weight: 0.15,
  },
  {
    code: 'C5',
    name: '초반 훅 정보 밀도',
    description: '첫 3~15초 훅에서 타겟 대상, 해결하는 문제, 핵심 가치가 즉시 요약되는지 평가합니다.',
    weight: 0.1,
  },
  {
    code: 'C6',
    name: '신뢰성 및 맥락 명시',
    description: '과장된 감탄사 대신 적용 대상, 제약 조건, 비교 맥락을 투명하게 밝혀 AI 추천 신뢰도를 높이는지 평가합니다.',
    weight: 0.1,
  },
];

export const PLATFORM_LABELS: Record<Platform, string> = {
  youtube_long: 'YouTube 롱폼',
  youtube_shorts: 'YouTube 쇼츠',
  reels: 'Instagram 릴스',
  tiktok: 'TikTok',
  other: '기타 영상',
};

export interface CriterionResult extends CriterionRaw {
  name: string;
  description: string;
  weight: number;
}

export interface DiagnoseResult {
  meta: {
    model: string;
    platform: Platform;
    platformLabel: string;
    brand: string;
    product: string;
    category: string;
    diagnosedAt: string;
  };
  overallScore: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  questionAvgScore: number;
  kbfAvgScore: number;
  transcript: TranscriptSegment[];
  hook: HookAnalysis;
  criteria: CriterionResult[];
  questionCoverage: QuestionCoverageItem[];
  kbfCoverage: KbfCoverageItem[];
  rewrites: RewriteItem[];
  textPackage: TextPackage;
}

export function buildPrompt(input: DiagnoseInput): string {
  const platformLabel = PLATFORM_LABELS[input.platform] ?? PLATFORM_LABELS.other;
  const criteriaGuide = GEO_CRITERIA.map(
    (c) => `- ${c.code} (${c.name}, 가중치 ${Math.round(c.weight * 100)}%): ${c.description}`
  ).join('\n');

  const questionsText =
    input.questions.length > 0
      ? input.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')
      : '(입력된 타겟 질문 없음 — 해당 제품·카테고리에서 소비자가 AI 검색에 자주 묻는 대표 질문 3~5개를 스스로 도출해 평가하세요.)';

  const kbfsText =
    input.kbfs.length > 0
      ? input.kbfs.map((k, i) => `${i + 1}. ${k}`).join('\n')
      : '(입력된 KBF 없음 — 해당 카테고리의 핵심 구매 요인 3~5개를 도출해 평가하세요.)';

  return `당신은 AI 검색 최적화(GEO, Generative Engine Optimization) 영상 진단 전문가입니다.
제공된 영상의 음성 나레이션과 화면 텍스트(자막/그래픽)를 모두 분석하여, ChatGPT·Perplexity·Gemini 같은 AI 검색 엔진이 이 영상을 정확히 이해하고 인용·추천할 수 있는지 진단하세요.
모든 응답은 한국어로 작성하고 지정된 JSON 스키마를 정확히 따르세요.

[분석 대상 정보]
- 플랫폼: ${platformLabel}
- 브랜드: ${input.brand || '미입력(영상에서 식별)'}
- 제품/서비스: ${input.product || '미입력(영상에서 식별)'}
- 카테고리: ${input.category || '미입력(영상에서 식별)'}

[타겟 AI 검색 질문]
${questionsText}

[핵심 구매 요인(KBF)]
${kbfsText}

[평가 기준 6가지 (각 0~100 정수 점수)]
${criteriaGuide}

[세부 작성 지침]
1. transcript: 영상의 주요 발화와 화면 자막을 시간순(MM:SS)으로 추출하세요.
2. hook: 초반 훅 구간의 timeRange(예: "00:00~00:08"), 실제 발화/자막 텍스트, GEO 관점의 문제점(problems), 그리고 AI 검색에 잘 인용되도록 개선한 훅 대안 2~3개(improved)를 제시하세요.
3. criteria: 반드시 C1~C6 6개 코드 모두 포함하고, 영상 속 실제 타임스탬프(MM:SS)와 인용문(evidence), 감점/평가 이유(reason), 구체적 수정 방안(fix)을 작성하세요.
4. questionCoverage: 각 타겟 질문별로 영상이 얼마나 직접 답하고 있는지 0~100점으로 평가하고, 답변이 등장한 시간(time, 없으면 "미언급")과 보완 노트(note)를 적으세요.
5. kbfCoverage: 각 KBF별로 구체적 근거·수치가 제시되었는지 0~100점으로 평가하고 note를 작성하세요.
6. rewrites: 추상적이거나 AI가 오해/누락하기 쉬운 대목 3~5개를 골라 원문(original), 문제(issues), GEO 최적화 대본(rewritten)을 제시하세요.
7. textPackage: 영상 업로드 시 함께 쓰면 AI 검색 노출에 유리한 제목(title), 설명란 리드 문단(descriptionLead), 타임스탬프 챕터(chapters), FAQ(faq)를 작성하세요.`;
}

function clampScore(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function computeGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'S';
  if (score >= 78) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  return 'D';
}

export function postProcess(raw: RawResult, input: DiagnoseInput, model: string): DiagnoseResult {
  const rawCriteriaMap = new Map<string, CriterionRaw>();
  for (const item of raw.criteria ?? []) {
    if (item?.code) {
      rawCriteriaMap.set(item.code.trim().toUpperCase(), item);
    }
  }

  const criteria: CriterionResult[] = GEO_CRITERIA.map((spec) => {
    const found = rawCriteriaMap.get(spec.code);
    return {
      code: spec.code,
      name: spec.name,
      description: spec.description,
      weight: spec.weight,
      score: clampScore(found?.score ?? 0),
      evidence: Array.isArray(found?.evidence) ? found.evidence : [],
      reason: found?.reason ?? '해당 항목에 대한 분석 근거가 생성되지 않았습니다.',
      fix: found?.fix ?? '구체적인 엔티티와 수치 근거를 대본에 추가하세요.',
    };
  });

  const overallScore = Math.round(
    criteria.reduce((sum, item) => sum + item.score * item.weight, 0)
  );

  const questionCoverage = (raw.questionCoverage ?? []).map((q) => ({
    question: q.question ?? '',
    score: clampScore(q.score),
    time: q.time || '미언급',
    note: q.note ?? '',
  }));

  const kbfCoverage = (raw.kbfCoverage ?? []).map((k) => ({
    kbf: k.kbf ?? '',
    score: clampScore(k.score),
    note: k.note ?? '',
  }));

  const questionAvgScore =
    questionCoverage.length > 0
      ? Math.round(questionCoverage.reduce((acc, q) => acc + q.score, 0) / questionCoverage.length)
      : 0;

  const kbfAvgScore =
    kbfCoverage.length > 0
      ? Math.round(kbfCoverage.reduce((acc, k) => acc + k.score, 0) / kbfCoverage.length)
      : 0;

  return {
    meta: {
      model,
      platform: input.platform,
      platformLabel: PLATFORM_LABELS[input.platform] ?? PLATFORM_LABELS.other,
      brand: input.brand,
      product: input.product,
      category: input.category,
      diagnosedAt: new Date().toISOString(),
    },
    overallScore,
    grade: computeGrade(overallScore),
    questionAvgScore,
    kbfAvgScore,
    transcript: Array.isArray(raw.transcript) ? raw.transcript : [],
    hook: {
      timeRange: raw.hook?.timeRange ?? '00:00~00:10',
      text: raw.hook?.text ?? '',
      problems: Array.isArray(raw.hook?.problems) ? raw.hook.problems : [],
      improved: Array.isArray(raw.hook?.improved) ? raw.hook.improved : [],
    },
    criteria,
    questionCoverage,
    kbfCoverage,
    rewrites: Array.isArray(raw.rewrites) ? raw.rewrites : [],
    textPackage: {
      title: raw.textPackage?.title ?? '',
      descriptionLead: raw.textPackage?.descriptionLead ?? '',
      chapters: Array.isArray(raw.textPackage?.chapters) ? raw.textPackage.chapters : [],
      faq: Array.isArray(raw.textPackage?.faq) ? raw.textPackage.faq : [],
    },
  };
}
