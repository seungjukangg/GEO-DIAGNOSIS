import React, { useState } from 'react';
import {
  Video,
  Link,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  MessageSquare,
  Target,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  Loader2,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import type { DiagnoseResult, Platform } from './geoCriteria';

type VideoSourceType = 'file' | 'youtube';

const PLATFORM_OPTIONS: { value: Platform; label: string }[] = [
  { value: 'youtube_long', label: 'YouTube 롱폼' },
  { value: 'youtube_shorts', label: 'YouTube 쇼츠' },
  { value: 'reels', label: 'Instagram 릴스' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'other', label: '기타 영상' },
];

function scoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (score >= 60) return 'text-amber-700 bg-amber-50 border-amber-200';
  return 'text-rose-700 bg-rose-50 border-rose-200';
}

function barColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-rose-500';
}

function gradeStyle(grade: DiagnoseResult['grade']): string {
  switch (grade) {
    case 'S':
      return 'bg-indigo-600 text-white';
    case 'A':
      return 'bg-emerald-600 text-white';
    case 'B':
      return 'bg-sky-600 text-white';
    case 'C':
      return 'bg-amber-500 text-white';
    default:
      return 'bg-rose-600 text-white';
  }
}

export function App() {
  const [sourceType, setSourceType] = useState<VideoSourceType>('file');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [platform, setPlatform] = useState<Platform>('youtube_long');
  const [brand, setBrand] = useState('');
  const [product, setProduct] = useState('');
  const [category, setCategory] = useState('');
  const [questions, setQuestions] = useState('');
  const [kbfs, setKbfs] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnoseResult | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (sourceType === 'file' && !videoFile) {
      setError('분석할 영상 파일을 선택해 주세요.');
      return;
    }
    if (sourceType === 'youtube' && !/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(youtubeUrl.trim())) {
      setError('유효한 공개 YouTube 주소(https://youtube.com/... 또는 https://youtu.be/...)를 입력해 주세요.');
      return;
    }

    const formData = new FormData();
    if (sourceType === 'file' && videoFile) {
      formData.append('video', videoFile);
    } else {
      formData.append('youtubeUrl', youtubeUrl.trim());
    }
    formData.append('platform', platform);
    formData.append('brand', brand);
    formData.append('product', product);
    formData.append('category', category);
    formData.append('questions', questions);
    formData.append('kbfs', kbfs);

    setLoading(true);
    try {
      const res = await fetch('/api/video-diagnose', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || '영상 진단 요청에 실패했습니다.');
      }
      setResult(data as DiagnoseResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">GEO 영상 진단</h1>
              <p className="text-xs text-slate-500">AI 검색 엔진 노출·인용 경쟁력 분석</p>
            </div>
          </div>
          {result && (
            <button
              type="button"
              onClick={() => setResult(null)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
            >
              <RefreshCw className="w-4 h-4" />
              새 영상 진단
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* 왼쪽: 입력 폼 */}
          <section className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Video className="w-4 h-4 text-indigo-600" />
              진단 대상 영상 설정
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 영상 소스 선택 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">영상 입력 방식</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSourceType('file')}
                    className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition ${
                      sourceType === 'file' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    파일 업로드
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceType('youtube')}
                    className={`flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition ${
                      sourceType === 'youtube' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Link className="w-3.5 h-3.5" />
                    YouTube URL
                  </button>
                </div>
              </div>

              {sourceType === 'file' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">영상 파일 (최대 200MB)</label>
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-4 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40 transition">
                    <Upload className="w-6 h-6 text-slate-400 mb-1.5" />
                    <span className="text-xs font-medium text-slate-700 text-center break-all">
                      {videoFile ? videoFile.name : 'MP4, MOV, WebM 파일 선택'}
                    </span>
                    {videoFile && (
                      <span className="text-[11px] text-slate-500 mt-1">
                        {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    )}
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">공개 YouTube URL</label>
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">게시 플랫폼</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as Platform)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {PLATFORM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">브랜드</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="예: 삼성전자"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">제품/서비스</label>
                  <input
                    type="text"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    placeholder="예: 갤럭시 버즈3"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">카테고리</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="예: 무선 이어폰 / 스킨케어"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  타겟 AI 검색 질문 <span className="text-slate-400 font-normal">(줄바꿈 또는 쉼표 구분, 최대 8개)</span>
                </label>
                <textarea
                  rows={3}
                  value={questions}
                  onChange={(e) => setQuestions(e.target.value)}
                  placeholder={'예: 장시간 착용해도 귀가 안 아픈가요?\n통화 품질은 어떤가요?'}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  핵심 구매 요인(KBF) <span className="text-slate-400 font-normal">(줄바꿈 또는 쉼표 구분)</span>
                </label>
                <textarea
                  rows={2}
                  value={kbfs}
                  onChange={(e) => setKbfs(e.target.value)}
                  placeholder={'예: 착용감 및 무게, 배터리 지속시간, 가성비'}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-semibold flex items-center justify-center gap-2 transition shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    영상 분석 중... (최대 1~2분 소요)
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    GEO 진단 시작
                  </>
                )}
              </button>
            </form>
          </section>

          {/* 오른쪽: 진단 결과 리포트 */}
          <section className="lg:col-span-8 space-y-6">
            {!result ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 mb-2">영상 GEO 진단 리포트가 여기에 표시됩니다</h2>
                <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  영상 파일 또는 공개 YouTube URL을 입력하면 음성과 화면 자막을 함께 분석해 AI 검색 인용 점수, 훅 개선안,
                  질문 응답률, 대본 리라이팅 및 업로드용 텍스트 패키지를 제공합니다.
                </p>
              </div>
            ) : (
              <>
                {/* 종합 점수 카드 */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                          {result.meta.platformLabel}
                        </span>
                        {result.meta.brand && <span>{result.meta.brand}</span>}
                        {result.meta.product && <span>· {result.meta.product}</span>}
                        {result.meta.category && <span>· {result.meta.category}</span>}
                      </div>
                      <h2 className="text-xl font-bold text-slate-900">GEO 종합 진단 점수</h2>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-3xl font-extrabold text-slate-900">
                          {result.overallScore}
                          <span className="text-base font-medium text-slate-400"> / 100</span>
                        </div>
                        <div className="text-xs text-slate-500">가중 평균 기준</div>
                      </div>
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-sm ${gradeStyle(
                          result.grade
                        )}`}
                      >
                        {result.grade}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-5">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-xs text-slate-500 mb-1">질문 응답 커버리지</div>
                      <div className="text-lg font-bold text-slate-900">{result.questionAvgScore}점</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="text-xs text-slate-500 mb-1">KBF 근거 충실도</div>
                      <div className="text-lg font-bold text-slate-900">{result.kbfAvgScore}점</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 col-span-2 sm:col-span-1">
                      <div className="text-xs text-slate-500 mb-1">분석 엔진</div>
                      <div className="text-sm font-semibold text-slate-800 truncate">{result.meta.model}</div>
                    </div>
                  </div>
                </div>

                {/* 세부 평가 기준 (C1~C6) */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                  <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    6대 GEO 평가 항목별 상세 진단
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.criteria.map((c) => (
                      <div key={c.code} className="rounded-xl border border-slate-200 p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[11px] font-bold text-indigo-600 uppercase">{c.code}</span>
                            <h4 className="text-sm font-semibold text-slate-900">{c.name}</h4>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${scoreColor(c.score)}`}>
                            {c.score}점
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${barColor(c.score)}`} style={{ width: `${c.score}%` }} />
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{c.reason}</p>
                        {c.evidence.length > 0 && (
                          <div className="space-y-1">
                            {c.evidence.map((ev, idx) => (
                              <div key={idx} className="text-[11px] bg-slate-50 rounded px-2 py-1 text-slate-600">
                                <span className="font-mono font-semibold text-indigo-600 mr-1.5">[{ev.time}]</span>
                                “{ev.quote}”
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="pt-1 border-t border-slate-100 text-xs text-slate-800">
                          <span className="font-semibold text-indigo-700">개선안: </span>
                          {c.fix}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 초반 훅 진단 */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <PlayCircle className="w-4 h-4 text-indigo-600" />
                      초반 훅(Hook) 진단
                    </h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {result.hook.timeRange}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800">
                    “{result.hook.text}”
                  </div>

                  {result.hook.problems.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-rose-700 mb-1.5">발견된 문제점</h4>
                      <ul className="list-disc list-inside space-y-1 text-xs text-slate-700">
                        {result.hook.problems.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.hook.improved.length > 0 && (
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-semibold text-emerald-700">GEO 최적화 훅 개선안</h4>
                      {result.hook.improved.map((imp, i) => (
                        <div key={i} className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-slate-900">{imp.text}</p>
                            <button
                              type="button"
                              onClick={() => handleCopy(`hook-${i}`, imp.text)}
                              className="text-slate-500 hover:text-slate-800 shrink-0"
                              title="복사"
                            >
                              {copiedKey === `hook-${i}` ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                          <p className="text-xs text-emerald-800">{imp.whatChanged}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 타겟 질문 & KBF 커버리지 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-600" />
                      질문 응답 커버리지
                    </h3>
                    <div className="space-y-3">
                      {result.questionCoverage.map((q, i) => (
                        <div key={i} className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-900">{q.question}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold border shrink-0 ${scoreColor(q.score)}`}>
                              {q.score}점
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-indigo-600">답변 시점: {q.time}</div>
                          <p className="text-xs text-slate-600">{q.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Target className="w-4 h-4 text-indigo-600" />
                      핵심 구매 요인(KBF) 커버리지
                    </h3>
                    <div className="space-y-3">
                      {result.kbfCoverage.map((k, i) => (
                        <div key={i} className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-900">{k.kbf}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold border shrink-0 ${scoreColor(k.score)}`}>
                              {k.score}점
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">{k.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 대본/자막 리라이팅 */}
                {result.rewrites.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      구간별 대본 리라이팅 제안
                    </h3>
                    <div className="space-y-3">
                      {result.rewrites.map((rw, i) => (
                        <div key={i} className="rounded-xl border border-slate-200 p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-semibold text-indigo-600">[{rw.time}]</span>
                            <div className="flex flex-wrap gap-1">
                              {rw.issues.map((issue, idx) => (
                                <span key={idx} className="text-[11px] px-2 py-0.5 rounded bg-rose-50 text-rose-700">
                                  {issue}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="text-xs text-slate-500 line-through">{rw.original}</div>
                          <div className="flex items-start justify-between gap-2 p-3 rounded-lg bg-indigo-50/60 border border-indigo-100">
                            <p className="text-sm text-slate-900 font-medium">{rw.rewritten}</p>
                            <button
                              type="button"
                              onClick={() => handleCopy(`rw-${i}`, rw.rewritten)}
                              className="text-slate-500 hover:text-slate-800 shrink-0"
                              title="복사"
                            >
                              {copiedKey === `rw-${i}` ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 업로드 텍스트 패키지 */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    AI 검색 최적화 텍스트 패키지
                  </h3>

                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-600">추천 영상 제목</span>
                        <button
                          type="button"
                          onClick={() => handleCopy('pkg-title', result.textPackage.title)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                          {copiedKey === 'pkg-title' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          복사
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{result.textPackage.title}</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-600">설명란 리드 요약</span>
                        <button
                          type="button"
                          onClick={() => handleCopy('pkg-desc', result.textPackage.descriptionLead)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        >
                          {copiedKey === 'pkg-desc' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          복사
                        </button>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{result.textPackage.descriptionLead}</p>
                    </div>

                    {result.textPackage.chapters.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-600">타임스탬프 챕터</span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(
                                'pkg-chapters',
                                result.textPackage.chapters.map((ch) => `${ch.time} ${ch.title}`).join('\n')
                              )
                            }
                            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          >
                            {copiedKey === 'pkg-chapters' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            전체 복사
                          </button>
                        </div>
                        <ul className="space-y-1 text-xs text-slate-700">
                          {result.textPackage.chapters.map((ch, idx) => (
                            <li key={idx}>
                              <span className="font-mono font-semibold text-indigo-600 mr-2">{ch.time}</span>
                              {ch.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.textPackage.faq.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <span className="text-xs font-semibold text-slate-600 block">고정 댓글 / 설명란 FAQ</span>
                        {result.textPackage.faq.map((item, idx) => (
                          <div key={idx} className="text-xs space-y-0.5 pt-1 border-t border-slate-200/70 first:border-t-0 first:pt-0">
                            <div className="font-semibold text-slate-900">Q. {item.q}</div>
                            <div className="text-slate-600">A. {item.a}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 추출된 전사/자막 (접기/펼치기) */}
                {result.transcript.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowTranscript((v) => !v)}
                      className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition"
                    >
                      <span className="text-sm font-bold text-slate-900">
                        추출된 나레이션 · 화면자막 ({result.transcript.length}구간)
                      </span>
                      {showTranscript ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </button>
                    {showTranscript && (
                      <div className="px-6 pb-5 space-y-2 border-t border-slate-100 pt-4">
                        {result.transcript.map((seg, i) => (
                          <div key={i} className="flex items-start gap-3 text-xs">
                            <span className="font-mono text-indigo-600 font-semibold shrink-0 pt-0.5">{seg.start}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium shrink-0">
                              {seg.source}
                            </span>
                            <span className="text-slate-800 leading-relaxed">{seg.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
