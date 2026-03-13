"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import FaceDetector, { DetectionState } from "../components/FaceDetector";
import { saveFace, isSupabaseConfigured } from "../../lib/supabase";

type Step = "intro" | "name" | "position" | "capture" | "done";

const CAPTURE_FRAMES = 5;     // 평균낼 프레임 수
const MIN_CONFIDENCE = 60;    // 최소 신뢰도 %

export default function RegisterPage() {
  const [step, setStep] = useState<Step>("intro");
  const [userName, setUserName] = useState("");
  const [nameError, setNameError] = useState("");

  const [faceDetected, setFaceDetected] = useState(false);
  const [liveConf, setLiveConf] = useState(0);
  const [liveLandmarks, setLiveLandmarks] = useState(0);

  const [captureCount, setCaptureCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedName, setSavedName] = useState("");

  // 여러 프레임 descriptor 수집 후 평균 계산
  const descriptorsRef = useRef<Float32Array[]>([]);
  const collectingRef = useRef(false);

  // ── position 단계: 얼굴 감지 여부 추적 ──────────────────────────
  const handlePositionDetection = useCallback((s: DetectionState) => {
    setFaceDetected(s.detected);
    setLiveConf(s.confidence);
    setLiveLandmarks(s.landmarkCount);
  }, []);

  // ── capture 단계: descriptor 수집 ────────────────────────────────
  const handleCaptureDetection = useCallback((s: DetectionState) => {
    if (!collectingRef.current) return;
    if (!s.detected || !s.descriptor || s.confidence < MIN_CONFIDENCE) return;

    descriptorsRef.current.push(s.descriptor);
    const cnt = descriptorsRef.current.length;
    setCaptureCount(cnt);

    if (cnt >= CAPTURE_FRAMES) {
      collectingRef.current = false;
      saveToSupabase(descriptorsRef.current);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Supabase 저장 ─────────────────────────────────────────────────
  async function saveToSupabase(descriptors: Float32Array[]) {
    setIsSaving(true);
    setSaveError("");
    try {
      // 여러 프레임 descriptor 평균 → 더 안정적인 특징값
      const avg = averageDescriptors(descriptors);
      await saveFace(userName, avg);
      setSavedName(userName);
      setStep("done");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "저장 실패");
      // 실패 시 재시도 가능하도록 리셋
      descriptorsRef.current = [];
      setCaptureCount(0);
      collectingRef.current = true;
    } finally {
      setIsSaving(false);
    }
  }

  function startCapture() {
    descriptorsRef.current = [];
    setCaptureCount(0);
    collectingRef.current = true;
    setStep("capture");
  }

  function validateName() {
    if (!userName.trim()) { setNameError("이름을 입력해 주세요."); return; }
    if (userName.trim().length < 2) { setNameError("이름은 2자 이상 입력해 주세요."); return; }
    setNameError("");
    setStep("position");
  }

  const stepIdx: Record<Step, number> = { intro: 0, name: 1, position: 2, capture: 3, done: 4 };

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0d0d1a 0%, #09090f 50%, #0a0d1f 100%)" }}>

      {/* BG glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 right-0 h-64 w-64 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #4f46e5 0%, transparent 70%)" }} />
        <div className="absolute bottom-20 -left-20 h-48 w-48 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #818cf8 0%, transparent 70%)" }} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex w-full max-w-sm items-center gap-3 px-6 pt-14 pb-4">
        <button onClick={() => {
          if (step === "intro") history.back();
          else setStep(step === "name" ? "intro" : step === "position" ? "name" : step === "capture" ? "position" : "intro");
        }}
          className="flex h-10 w-10 items-center justify-center rounded-xl transition-all active:scale-95"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <svg className="h-4 w-4" style={{ color: "#818cf8" }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-base font-semibold" style={{ color: "#e8eaf6" }}>얼굴 등록</h2>
          <p className="text-xs" style={{ color: "#4b5563" }}>Face Registration</p>
        </div>
        <div className="ml-auto flex gap-1.5">
          {(["intro", "name", "position", "capture", "done"] as Step[]).map((s, i) => (
            <div key={s} className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: step === s ? "18px" : "5px", background: stepIdx[step] >= i ? "#6366f1" : "rgba(255,255,255,0.12)" }} />
          ))}
        </div>
      </header>

      <main className="relative z-10 flex w-full max-w-sm flex-1 flex-col px-6 pb-10 gap-5">

        {/* ── Intro ─────────────────────────────────────────────── */}
        {step === "intro" && (
          <>
            <div className="flex flex-1 flex-col items-center justify-center gap-6">
              <div className="animate-float flex h-28 w-28 items-center justify-center rounded-full"
                style={{ background: "linear-gradient(145deg,rgba(79,70,229,.25),rgba(99,102,241,.08))", border: "2px solid rgba(99,102,241,.35)", boxShadow: "0 0 50px rgba(99,102,241,.2)" }}>
                <svg className="h-12 w-12" style={{ color: "#818cf8" }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div className="text-center">
                <h1 className="mb-1.5 text-xl font-bold" style={{ color: "#e8eaf6" }}>얼굴을 등록해 주세요</h1>
                <p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>
                  AI가 128차원 특징 벡터를 추출해<br />Supabase에 안전하게 저장합니다.
                </p>
              </div>

              {!isSupabaseConfigured() && (
                <div className="w-full rounded-2xl px-4 py-3.5"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)" }}>
                  <p className="mb-1 text-xs font-semibold" style={{ color: "#fbbf24" }}>⚠ Supabase 미연결</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#6b7280" }}>
                    <code className="text-xs" style={{ color: "#f59e0b" }}>.env.local</code>에 URL과 ANON_KEY를 설정하고,<br />
                    <code className="text-xs" style={{ color: "#f59e0b" }}>supabase/schema.sql</code>을 실행해 주세요.
                  </p>
                </div>
              )}

              <div className="w-full space-y-2.5">
                {[
                  { icon: "💡", title: "밝은 환경", desc: "충분한 조명 아래에서 진행하세요" },
                  { icon: "😊", title: "정면 응시", desc: "카메라를 정면으로 바라봐 주세요" },
                  { icon: "🚫", title: "가림 금지", desc: "마스크, 선글라스를 벗어 주세요" },
                ].map((it) => (
                  <div key={it.title} className="flex items-center gap-4 rounded-2xl px-4 py-3"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <span className="text-xl">{it.icon}</span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#c7d2fe" }}>{it.title}</p>
                      <p className="text-xs" style={{ color: "#4b5563" }}>{it.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setStep("name")}
              className="w-full rounded-2xl py-5 text-base font-semibold text-white active:scale-[0.97]"
              style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", boxShadow: "0 4px 24px rgba(99,102,241,.4)" }}>
              시작하기
            </button>
          </>
        )}

        {/* ── Name Input ────────────────────────────────────────── */}
        {step === "name" && (
          <>
            <div className="flex flex-1 flex-col justify-center gap-6">
              <div className="text-center">
                <div className="mb-4 flex items-center justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl"
                    style={{ background: "rgba(99,102,241,0.15)", border: "1.5px solid rgba(99,102,241,0.3)" }}>
                    <svg className="h-7 w-7" style={{ color: "#818cf8" }} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                </div>
                <h1 className="mb-1.5 text-xl font-bold" style={{ color: "#e8eaf6" }}>이름을 입력해 주세요</h1>
                <p className="text-sm" style={{ color: "#6b7280" }}>얼굴과 함께 저장될 이름입니다</p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium" style={{ color: "#9ca3af" }}>이름</label>
                <div className="relative">
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => { setUserName(e.target.value); setNameError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && validateName()}
                    placeholder="홍길동"
                    maxLength={30}
                    autoFocus
                    className="w-full rounded-2xl px-5 py-4 text-base outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: nameError ? "1.5px solid rgba(239,68,68,0.6)" : "1.5px solid rgba(99,102,241,0.35)",
                      color: "#e8eaf6",
                      caretColor: "#818cf8",
                    }}
                  />
                  {userName && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs" style={{ color: "#4b5563" }}>
                      {userName.length}/30
                    </div>
                  )}
                </div>
                {nameError && (
                  <p className="flex items-center gap-1.5 text-xs" style={{ color: "#f87171" }}>
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    {nameError}
                  </p>
                )}
              </div>

              {/* 등록 예시 */}
              <div className="rounded-2xl px-4 py-3.5"
                style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
                <p className="mb-2 text-xs font-medium" style={{ color: "#818cf8" }}>저장 데이터 미리보기</p>
                <div className="space-y-1.5">
                  {[
                    { label: "이름", value: userName || "(미입력)" },
                    { label: "특징 벡터", value: "128차원 float32[]" },
                    { label: "저장소", value: "Supabase (face_data)" },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between">
                      <span className="text-xs" style={{ color: "#4b5563" }}>{row.label}</span>
                      <span className="text-xs font-medium" style={{ color: "#a5b4fc" }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={validateName}
              className="w-full rounded-2xl py-5 text-base font-semibold text-white active:scale-[0.97]"
              style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", boxShadow: "0 4px 24px rgba(99,102,241,.4)" }}>
              다음 — 얼굴 촬영
            </button>
          </>
        )}

        {/* ── Position ──────────────────────────────────────────── */}
        {step === "position" && (
          <>
            <div className="text-center">
              <p className="text-xs font-semibold mb-1" style={{ color: "#6366f1" }}>등록자: {userName}</p>
              <h1 className="mb-1 text-lg font-bold" style={{ color: "#e8eaf6" }}>얼굴을 카메라에 맞춰주세요</h1>
              <p className="text-sm" style={{ color: "#6b7280" }}>
                {faceDetected ? "완벽합니다! 촬영을 시작하세요." : "파란 박스가 나타날 때까지 조정하세요"}
              </p>
            </div>

            <FaceDetector active={step === "position"} onDetection={handlePositionDetection} height="290px" />

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "감지 상태", value: faceDetected ? "감지됨" : "탐색 중", ok: faceDetected },
                { label: "신뢰도", value: faceDetected ? `${liveConf}%` : "--", ok: liveConf >= 60 },
                { label: "특징점", value: faceDetected ? `${liveLandmarks}개` : "--", ok: liveLandmarks >= 68 },
              ].map((it) => (
                <div key={it.label} className="rounded-xl px-2 py-2.5 text-center transition-all"
                  style={{ background: it.ok ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.04)", border: `1px solid ${it.ok ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.07)"}` }}>
                  <p className="text-sm font-semibold" style={{ color: it.ok ? "#6ee7b7" : "#9ca3af" }}>{it.value}</p>
                  <p className="text-xs" style={{ color: "#4b5563" }}>{it.label}</p>
                </div>
              ))}
            </div>

            <button onClick={startCapture} disabled={!faceDetected}
              className="w-full rounded-2xl py-5 text-base font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
              style={{ background: faceDetected ? "linear-gradient(135deg,#4f46e5,#6366f1)" : "rgba(99,102,241,.3)", boxShadow: faceDetected ? "0 4px 24px rgba(99,102,241,.4)" : "none" }}>
              {faceDetected ? "촬영 시작" : "얼굴 감지 대기 중..."}
            </button>
          </>
        )}

        {/* ── Capture ───────────────────────────────────────────── */}
        {step === "capture" && (
          <>
            <div className="text-center">
              <h1 className="mb-1 text-lg font-bold" style={{ color: isSaving ? "#f59e0b" : "#e8eaf6" }}>
                {isSaving ? "Supabase에 저장 중..." : "특징 벡터 수집 중"}
              </h1>
              <p className="text-sm" style={{ color: "#6b7280" }}>
                {isSaving ? "잠시만 기다려 주세요" : "정면을 바라보고 잠시 기다려 주세요"}
              </p>
            </div>

            <FaceDetector active={!isSaving} onDetection={handleCaptureDetection} height="290px" />

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "#9ca3af" }}>
                  {isSaving ? "저장 중..." : "128차원 벡터 수집"}
                </span>
                <span className="font-semibold" style={{ color: "#818cf8" }}>
                  {captureCount} / {CAPTURE_FRAMES}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: isSaving ? "100%" : `${(captureCount / CAPTURE_FRAMES) * 100}%`,
                    background: isSaving ? "linear-gradient(90deg,#f59e0b,#fbbf24)" : "linear-gradient(90deg,#4f46e5,#818cf8)",
                    boxShadow: `0 0 8px ${isSaving ? "rgba(245,158,11,.6)" : "rgba(99,102,241,.6)"}`,
                  }} />
              </div>
              <div className="flex justify-center gap-2">
                {Array.from({ length: CAPTURE_FRAMES }).map((_, i) => (
                  <div key={i} className="h-2.5 w-2.5 rounded-full transition-all duration-200"
                    style={{
                      background: i < captureCount ? "#6366f1" : "rgba(255,255,255,0.12)",
                      boxShadow: i < captureCount ? "0 0 8px rgba(99,102,241,.7)" : "none",
                    }} />
                ))}
              </div>
            </div>

            {saveError && (
              <div className="rounded-2xl px-4 py-3"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <p className="text-xs" style={{ color: "#fca5a5" }}>저장 오류: {saveError}</p>
                <p className="text-xs mt-1" style={{ color: "#6b7280" }}>자동으로 재시도합니다...</p>
              </div>
            )}
          </>
        )}

        {/* ── Done ──────────────────────────────────────────────── */}
        {step === "done" && (
          <>
            <div className="flex flex-1 flex-col items-center justify-center gap-6">
              <div className="flex h-28 w-28 items-center justify-center rounded-full"
                style={{ background: "linear-gradient(145deg,rgba(16,185,129,.2),rgba(16,185,129,.05))", border: "2px solid rgba(16,185,129,.4)", boxShadow: "0 0 50px rgba(16,185,129,.2)" }}>
                <svg className="h-14 w-14" style={{ color: "#34d399" }} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <div className="text-center">
                <h1 className="mb-1.5 text-2xl font-bold" style={{ color: "#e8eaf6" }}>등록 완료!</h1>
                <p className="text-sm" style={{ color: "#6b7280" }}>
                  <span style={{ color: "#a5b4fc" }}>{savedName}</span>님의 얼굴이 등록되었습니다.
                </p>
              </div>

              <div className="w-full space-y-2">
                {[
                  { label: "등록자 이름", value: savedName },
                  { label: "수집 프레임", value: `${CAPTURE_FRAMES}개 평균` },
                  { label: "특징 벡터 차원", value: "128 (float32)" },
                  { label: "저장소", value: "Supabase · face_data" },
                  { label: "등록 일시", value: new Date().toLocaleString("ko-KR") },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
                    <span className="text-sm" style={{ color: "#4b5563" }}>{row.label}</span>
                    <span className="text-sm font-medium" style={{ color: "#6ee7b7" }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Link href="/auth" className="block w-full">
                <button className="w-full rounded-2xl py-5 text-base font-semibold text-white active:scale-[0.97]"
                  style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", boxShadow: "0 4px 24px rgba(99,102,241,.45)" }}>
                  인증 시작하기
                </button>
              </Link>
              <Link href="/" className="block text-center py-2 text-sm" style={{ color: "#4b5563" }}>
                홈으로 돌아가기
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ── 여러 descriptor 평균 계산 ──────────────────────────────────────
function averageDescriptors(descriptors: Float32Array[]): Float32Array {
  const len = descriptors[0].length;
  const result = new Float32Array(len);
  for (const desc of descriptors) {
    for (let i = 0; i < len; i++) result[i] += desc[i];
  }
  for (let i = 0; i < len; i++) result[i] /= descriptors.length;
  return result;
}
