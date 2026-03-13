"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import FaceDetector, { DetectionState } from "../components/FaceDetector";
import { getAllFaces, findBestMatch, isSupabaseConfigured, type FaceRecord } from "../../lib/supabase";

type Status = "idle" | "loading_faces" | "scanning" | "verifying" | "success" | "fail";

const AUTH_THRESHOLD = 80;     // 인증 통과 일치율 %
const CONFIRM_FRAMES = 5;      // 연속 N프레임 이상 통과해야 인증

export default function AuthPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [faces, setFaces] = useState<FaceRecord[]>([]);
  const [loadError, setLoadError] = useState("");

  // 인증 결과
  const [matchedName, setMatchedName] = useState("");
  const [matchRate, setMatchRate] = useState(0);
  const [distance, setDistance] = useState(0);

  // 실시간 스캔 수치
  const [liveConf, setLiveConf] = useState(0);
  const [liveMatchRate, setLiveMatchRate] = useState(0);
  const [liveMatchName, setLiveMatchName] = useState("");
  const [confirmCount, setConfirmCount] = useState(0);  // UI 표시용 state

  const confirmCountRef = useRef(0);  // 로직용 ref (stale closure 방지)
  const scanningRef = useRef(false);
  const facesRef = useRef<FaceRecord[]>([]);

  // 항상 최신 faces 유지
  useEffect(() => { facesRef.current = faces; }, [faces]);

  // ── Supabase에서 등록된 얼굴 로드 ────────────────────────────────
  async function loadFaces() {
    setStatus("loading_faces");
    setLoadError("");
    try {
      const data = await getAllFaces();
      setFaces(data);
      setStatus("scanning");
      confirmCountRef.current = 0;
      setConfirmCount(0);
      scanningRef.current = true;
      setLiveConf(0);
      setLiveMatchRate(0);
      setLiveMatchName("");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "로드 실패");
      setStatus("idle");
    }
  }

  // ── 매 프레임 감지 콜백 ───────────────────────────────────────────
  const handleDetection = useCallback((state: DetectionState) => {
    if (!scanningRef.current) return;
    setLiveConf(state.confidence);

    if (!state.detected || !state.descriptor) {
      setLiveMatchRate(0);
      setLiveMatchName("");
      confirmCountRef.current = 0;
      setConfirmCount(0);
      return;
    }

    const best = findBestMatch(state.descriptor, facesRef.current);
    if (!best) {
      setLiveMatchRate(0);
      setLiveMatchName("");
      return;
    }

    setLiveMatchRate(best.matchRate);
    setLiveMatchName(best.record.name);

    if (best.matchRate >= AUTH_THRESHOLD) {
      confirmCountRef.current += 1;
      setConfirmCount(confirmCountRef.current);   // UI 표시 업데이트

      if (confirmCountRef.current >= CONFIRM_FRAMES) {
        // 인증 통과!
        scanningRef.current = false;
        setMatchedName(best.record.name);
        setMatchRate(best.matchRate);
        setDistance(best.distance);
        setStatus("verifying");

        setTimeout(() => setStatus("success"), 1500);
      }
    } else {
      // 임계값 미달 시 카운터 리셋
      confirmCountRef.current = 0;
      setConfirmCount(0);
    }
  }, []);

  const reset = () => {
    scanningRef.current = false;
    confirmCountRef.current = 0;
    setConfirmCount(0);
    setStatus("idle");
    setLiveConf(0);
    setLiveMatchRate(0);
    setLiveMatchName("");
    setMatchedName("");
    setMatchRate(0);
  };

  const accentColor = {
    idle: "#6366f1", loading_faces: "#818cf8",
    scanning: "#818cf8", verifying: "#f59e0b",
    success: "#10b981", fail: "#ef4444",
  }[status];

  // 일치율 색상
  const rateColor = liveMatchRate >= AUTH_THRESHOLD ? "#34d399"
    : liveMatchRate >= 70 ? "#fbbf24"
    : "#6b7280";

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0d0d1a 0%, #09090f 50%, #0a0d1f 100%)" }}>

      {/* BG glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full opacity-20 transition-all duration-700"
          style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)` }} />
        <div className="absolute bottom-16 -right-16 h-48 w-48 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #818cf8 0%, transparent 70%)" }} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex w-full max-w-sm items-center gap-3 px-6 pt-14 pb-4">
        <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-xl active:scale-95"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <svg className="h-4 w-4" style={{ color: "#818cf8" }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div>
          <h2 className="text-base font-semibold" style={{ color: "#e8eaf6" }}>인증 시작</h2>
          <p className="text-xs" style={{ color: "#4b5563" }}>Face Authentication</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-500"
          style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}44`, color: accentColor }}>
          <div className="h-1.5 w-1.5 rounded-full"
            style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}`, animation: ["scanning","verifying","loading_faces"].includes(status) ? "pulse 1s ease-in-out infinite" : "none" }} />
          {{ idle: "대기 중", loading_faces: "로딩 중", scanning: "스캔 중", verifying: "검증 중", success: "성공", fail: "실패" }[status]}
        </div>
      </header>

      <main className="relative z-10 flex w-full max-w-sm flex-1 flex-col px-6 pb-10 gap-5">

        {/* ── Idle ─────────────────────────────────────────────── */}
        {status === "idle" && (
          <>
            <div className="flex flex-col items-center gap-5 py-2">
              <div className="animate-float flex h-32 w-32 items-center justify-center rounded-full"
                style={{ background: "linear-gradient(145deg,rgba(79,70,229,.2),rgba(99,102,241,.06))", border: "2px solid rgba(99,102,241,.35)", boxShadow: "0 0 60px rgba(99,102,241,.15)" }}>
                <svg className="h-14 w-14" style={{ color: "#818cf8" }} fill="none" stroke="currentColor" strokeWidth="1.2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33" />
                </svg>
              </div>
              <div className="text-center">
                <h1 className="mb-1 text-xl font-bold" style={{ color: "#e8eaf6" }}>얼굴 인증</h1>
                <p className="text-sm" style={{ color: "#6b7280" }}>
                  일치율 <span style={{ color: "#a5b4fc" }}>{AUTH_THRESHOLD}% 이상</span>이면 인증 완료
                </p>
              </div>
            </div>

            {!isSupabaseConfigured() && (
              <div className="rounded-2xl px-4 py-3.5"
                style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)" }}>
                <p className="text-xs font-semibold mb-1" style={{ color: "#fbbf24" }}>⚠ Supabase 미연결</p>
                <p className="text-xs" style={{ color: "#6b7280" }}>.env.local에 URL과 ANON_KEY를 설정해 주세요.</p>
              </div>
            )}

            {loadError && (
              <div className="rounded-2xl px-4 py-3"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <p className="text-xs" style={{ color: "#fca5a5" }}>오류: {loadError}</p>
              </div>
            )}

            <div className="space-y-2">
              {[
                { label: "인증 방식", value: "128차원 벡터 유사도", icon: "🔐" },
                { label: "인증 기준", value: `일치율 ≥ ${AUTH_THRESHOLD}%`, icon: "📊" },
                { label: "확인 프레임", value: `연속 ${CONFIRM_FRAMES}프레임`, icon: "🎯" },
                { label: "저장소", value: "Supabase", icon: "☁️" },
              ].map((it) => (
                <div key={it.label} className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center gap-3">
                    <span className="text-base">{it.icon}</span>
                    <span className="text-sm" style={{ color: "#9ca3af" }}>{it.label}</span>
                  </div>
                  <span className="text-sm font-medium" style={{ color: "#c7d2fe" }}>{it.value}</span>
                </div>
              ))}
            </div>

            <button onClick={loadFaces}
              className="mt-auto w-full rounded-2xl py-5 text-base font-semibold text-white active:scale-[0.97]"
              style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", boxShadow: "0 4px 24px rgba(99,102,241,.45)" }}>
              인증 시작
            </button>
          </>
        )}

        {/* ── Loading Faces ─────────────────────────────────────── */}
        {status === "loading_faces" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <div className="relative h-16 w-16">
              <svg className="animate-spin-slow absolute inset-0 h-full w-full" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="28" stroke="rgba(99,102,241,0.2)" strokeWidth="3" />
                <circle cx="32" cy="32" r="28" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeDasharray="50 126" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xl">☁️</div>
            </div>
            <p className="text-sm font-medium" style={{ color: "#818cf8" }}>등록된 얼굴 데이터 로딩 중...</p>
            <p className="text-xs" style={{ color: "#4b5563" }}>Supabase에서 특징 벡터를 가져옵니다</p>
          </div>
        )}

        {/* ── Scanning ──────────────────────────────────────────── */}
        {status === "scanning" && (
          <>
            <div className="text-center">
              <h1 className="mb-0.5 text-lg font-bold" style={{ color: "#818cf8" }}>얼굴을 인식하는 중...</h1>
              <p className="text-xs" style={{ color: "#4b5563" }}>
                등록된 얼굴 {faces.length}명과 비교 중
              </p>
            </div>

            <FaceDetector active={status === "scanning"} onDetection={handleDetection} height="290px" />

            {/* 실시간 일치율 게이지 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: "#9ca3af" }}>현재 일치율</span>
                  {liveMatchName && (
                    <span className="rounded-full px-2 py-0.5 text-xs"
                      style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc" }}>
                      {liveMatchName}
                    </span>
                  )}
                </div>
                <span className="text-lg font-bold tabular-nums transition-all"
                  style={{ color: rateColor }}>
                  {liveMatchRate}%
                </span>
              </div>

              {/* 게이지 바 */}
              <div className="relative h-3 w-full overflow-hidden rounded-full"
                style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full transition-all duration-150"
                  style={{
                    width: `${liveMatchRate}%`,
                    background: liveMatchRate >= AUTH_THRESHOLD
                      ? "linear-gradient(90deg,#059669,#34d399)"
                      : liveMatchRate >= 70
                        ? "linear-gradient(90deg,#d97706,#fbbf24)"
                        : "linear-gradient(90deg,#4f46e5,#818cf8)",
                    boxShadow: liveMatchRate >= AUTH_THRESHOLD ? "0 0 10px rgba(52,211,153,.5)" : "none",
                  }} />
                {/* 90% 기준선 */}
                <div className="absolute top-0 bottom-0 w-0.5"
                  style={{ left: `${AUTH_THRESHOLD}%`, background: "rgba(255,255,255,0.4)" }} />
              </div>
              <div className="flex justify-between text-xs" style={{ color: "#374151" }}>
                <span>0%</span>
                <span style={{ color: "#6366f1" }}>{AUTH_THRESHOLD}% 기준선</span>
                <span>100%</span>
              </div>
            </div>

            {/* 실시간 수치 */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "카메라 신뢰도", value: liveConf > 0 ? `${liveConf}%` : "--", ok: liveConf >= 60 },
                { label: "일치율", value: liveMatchRate > 0 ? `${liveMatchRate}%` : "--", ok: liveMatchRate >= AUTH_THRESHOLD },
                { label: "확인 중", value: `${Math.min(confirmCount, CONFIRM_FRAMES)}/${CONFIRM_FRAMES}`, ok: confirmCount > 0 },
              ].map((it) => (
                <div key={it.label} className="rounded-xl px-2 py-2.5 text-center"
                  style={{ background: it.ok ? "rgba(99,102,241,.1)" : "rgba(255,255,255,.04)", border: `1px solid ${it.ok ? "rgba(99,102,241,.35)" : "rgba(255,255,255,.07)"}` }}>
                  <p className="text-sm font-semibold" style={{ color: it.ok ? "#a5b4fc" : "#6b7280" }}>{it.value}</p>
                  <p className="text-xs" style={{ color: "#4b5563" }}>{it.label}</p>
                </div>
              ))}
            </div>

            <button onClick={reset}
              className="w-full rounded-2xl py-4 text-sm font-medium active:scale-[0.97]"
              style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", color: "#6b7280" }}>
              취소
            </button>
          </>
        )}

        {/* ── Verifying ─────────────────────────────────────────── */}
        {status === "verifying" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <div className="relative flex items-center justify-center">
              <svg className="animate-spin-slow absolute h-44 w-44" viewBox="0 0 176 176" fill="none">
                <circle cx="88" cy="88" r="82" stroke="rgba(245,158,11,.15)" strokeWidth="2" />
                <circle cx="88" cy="88" r="82" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeDasharray="80 436" />
              </svg>
              <div className="flex h-32 w-32 flex-col items-center justify-center gap-2 rounded-full"
                style={{ background: "linear-gradient(145deg,rgba(245,158,11,.15),rgba(245,158,11,.05))", border: "2px solid rgba(245,158,11,.35)", boxShadow: "0 0 50px rgba(245,158,11,.15)" }}>
                <svg className="h-10 w-10" style={{ color: "#f59e0b" }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                </svg>
                <span className="text-xs font-medium" style={{ color: "#fbbf24" }}>최종 검증</span>
              </div>
            </div>
            <div className="text-center">
              <h2 className="mb-1 text-xl font-bold" style={{ color: "#f59e0b" }}>일치율 {matchRate}% 확인됨</h2>
              <p className="text-sm" style={{ color: "#6b7280" }}>인증을 완료하는 중입니다</p>
            </div>
          </div>
        )}

        {/* ── Success ───────────────────────────────────────────── */}
        {status === "success" && (
          <>
            <div className="flex flex-col items-center gap-5 py-2">
              <div className="flex h-28 w-28 items-center justify-center rounded-full"
                style={{ background: "linear-gradient(145deg,rgba(16,185,129,.2),rgba(16,185,129,.05))", border: "2px solid rgba(16,185,129,.4)", boxShadow: "0 0 50px rgba(16,185,129,.2)" }}>
                <svg className="h-14 w-14" style={{ color: "#34d399" }} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <div className="text-center">
                <p className="mb-1 text-sm" style={{ color: "#6b7280" }}>인증된 사용자</p>
                <h1 className="text-2xl font-bold" style={{ color: "#34d399" }}>{matchedName}</h1>
                <p className="mt-1 text-sm" style={{ color: "#6b7280" }}>인증이 완료되었습니다</p>
              </div>
            </div>

            {/* 일치율 시각화 */}
            <div className="rounded-2xl px-5 py-4"
              style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: "#6ee7b7" }}>인증 결과</p>
                <span className="text-2xl font-bold tabular-nums" style={{ color: "#34d399" }}>{matchRate}%</span>
              </div>

              {/* 최종 일치율 바 */}
              <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full"
                style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full"
                  style={{ width: `${matchRate}%`, background: "linear-gradient(90deg,#059669,#34d399)", boxShadow: "0 0 10px rgba(52,211,153,.5)" }} />
              </div>

              <div className="space-y-2">
                {[
                  { label: "인증된 사용자", value: matchedName },
                  { label: "일치율", value: `${matchRate}% (기준: ${AUTH_THRESHOLD}%)` },
                  { label: "벡터 거리", value: distance.toFixed(4) },
                  { label: "인증 시각", value: new Date().toLocaleTimeString("ko-KR") },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between">
                    <span className="text-xs" style={{ color: "#4b5563" }}>{row.label}</span>
                    <span className="text-xs font-medium" style={{ color: "#a7f3d0" }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button className="w-full rounded-2xl py-5 text-base font-semibold text-white active:scale-[0.97]"
                style={{ background: "linear-gradient(135deg,#059669,#10b981)", boxShadow: "0 4px 24px rgba(16,185,129,.35)" }}>
                서비스 이용하기
              </button>
              <button onClick={reset} className="py-3 text-sm" style={{ color: "#4b5563" }}>
                다시 인증하기
              </button>
            </div>
          </>
        )}

        {/* ── Fail ──────────────────────────────────────────────── */}
        {status === "fail" && (
          <>
            <div className="flex flex-col items-center gap-5 py-2">
              <div className="flex h-28 w-28 items-center justify-center rounded-full"
                style={{ background: "linear-gradient(145deg,rgba(239,68,68,.15),rgba(239,68,68,.05))", border: "2px solid rgba(239,68,68,.35)", boxShadow: "0 0 50px rgba(239,68,68,.15)" }}>
                <svg className="h-14 w-14" style={{ color: "#f87171" }} fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-center">
                <h1 className="mb-1 text-2xl font-bold" style={{ color: "#f87171" }}>인증 실패</h1>
                <p className="text-sm" style={{ color: "#6b7280" }}>일치율이 {AUTH_THRESHOLD}% 미만입니다</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-auto">
              <button onClick={reset} className="w-full rounded-2xl py-5 text-base font-semibold active:scale-[0.97]"
                style={{ background: "rgba(255,255,255,.04)", border: "1.5px solid rgba(99,102,241,.45)", color: "#a5b4fc" }}>
                다시 시도하기
              </button>
              <Link href="/register" className="block w-full">
                <button className="w-full py-3 text-sm" style={{ color: "#4b5563" }}>얼굴 재등록하기</button>
              </Link>
            </div>
          </>
        )}

      </main>
    </div>
  );
}
