"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0d0d1a 0%, #09090f 50%, #0a0d1f 100%)" }}
    >
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -left-32 h-80 w-80 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #4f46e5 0%, transparent 70%)" }}
        />
        <div
          className="absolute top-1/3 -right-24 h-64 w-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-32 left-1/4 h-48 w-48 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #818cf8 0%, transparent 70%)" }}
        />
        {/* Grid lines */}
        <svg className="absolute inset-0 h-full w-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#818cf8" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Header */}
      <header className="anim-1 relative z-10 w-full max-w-sm px-6 pt-16 text-center">
        <div className="mb-3 flex items-center justify-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "linear-gradient(135deg, #4f46e5, #818cf8)" }}
          >
            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-widest" style={{ color: "#818cf8" }}>FACEAUTH</span>
        </div>
        <p className="text-xs tracking-wider" style={{ color: "#4b5563" }}>SECURE BANKING SYSTEM</p>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-10 px-6 py-8">

        {/* Face icon / hero area */}
        <div className="anim-2 flex flex-col items-center gap-5">
          <div className="animate-float relative flex items-center justify-center">
            {/* Outer glow ring */}
            <div
              className="face-ring absolute h-44 w-44 rounded-full"
              style={{
                background: "transparent",
                border: "2px solid rgba(99,102,241,0.3)",
              }}
            />
            {/* Mid ring */}
            <div
              className="absolute h-36 w-36 rounded-full"
              style={{ border: "1px solid rgba(99,102,241,0.15)" }}
            />
            {/* Inner circle */}
            <div
              className="flex h-28 w-28 items-center justify-center rounded-full"
              style={{
                background: "linear-gradient(145deg, rgba(79,70,229,0.2), rgba(99,102,241,0.08))",
                border: "1.5px solid rgba(99,102,241,0.4)",
                boxShadow: "0 0 40px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              {/* Face SVG */}
              <svg className="h-12 w-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Face outline */}
                <path
                  d="M24 6C14.059 6 6 14.059 6 24s8.059 18 18 18 18-8.059 18-18S33.941 6 24 6z"
                  stroke="#818cf8"
                  strokeWidth="1.5"
                  fill="none"
                />
                {/* Scan corners */}
                <path d="M10 10 L10 14 M10 10 L14 10" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M38 10 L38 14 M38 10 L34 10" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M10 38 L10 34 M10 38 L14 38" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M38 38 L38 34 M38 38 L34 38" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
                {/* Eyes */}
                <circle cx="18.5" cy="22" r="2" fill="#818cf8" />
                <circle cx="29.5" cy="22" r="2" fill="#818cf8" />
                {/* Smile */}
                <path d="M18 30 Q24 35 30 30" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                {/* Nose */}
                <path d="M24 22 L22.5 27 L25.5 27" stroke="#6366f1" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            </div>
          </div>

          <div className="text-center">
            <h1 className="mb-1 text-2xl font-bold tracking-tight" style={{ color: "#e8eaf6" }}>
              얼굴 인증 시스템
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "#6b7280" }}>
              AI 기반 생체인식으로 안전하게<br />본인을 인증하세요
            </p>
          </div>
        </div>

        {/* Stats bar */}
        <div className="anim-3 glass w-full rounded-2xl px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: "#818cf8" }}>99.9%</p>
              <p className="text-xs" style={{ color: "#4b5563" }}>인증 정확도</p>
            </div>
            <div className="h-8 w-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: "#818cf8" }}>0.3s</p>
              <p className="text-xs" style={{ color: "#4b5563" }}>평균 처리 시간</p>
            </div>
            <div className="h-8 w-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            <div className="text-center">
              <p className="text-lg font-bold" style={{ color: "#818cf8" }}>AES-256</p>
              <p className="text-xs" style={{ color: "#4b5563" }}>암호화 방식</p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="anim-4 flex w-full flex-col gap-4">
          <Link href="/register" className="block w-full">
            <button
              className="group relative w-full overflow-hidden rounded-2xl py-5 text-base font-semibold text-white transition-all active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                boxShadow: "0 4px 24px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              {/* Shine effect */}
              <div
                className="absolute inset-0 opacity-0 transition-opacity group-active:opacity-100"
                style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.1), transparent)" }}
              />
              <div className="flex items-center justify-center gap-3">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <span>얼굴 등록</span>
                <svg className="h-4 w-4 opacity-70" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </button>
          </Link>

          <Link href="/auth" className="block w-full">
            <button
              className="group relative w-full overflow-hidden rounded-2xl py-5 text-base font-semibold transition-all active:scale-[0.97]"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1.5px solid rgba(99,102,241,0.45)",
                color: "#a5b4fc",
                boxShadow: "0 4px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              <div
                className="absolute inset-0 opacity-0 transition-opacity group-active:opacity-100"
                style={{ background: "rgba(99,102,241,0.08)" }}
              />
              <div className="flex items-center justify-center gap-3">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33" />
                </svg>
                <span>인증 시작</span>
                <svg className="h-4 w-4 opacity-70" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </button>
          </Link>
        </div>

        {/* Notice */}
        <div className="anim-5 flex items-start gap-2 rounded-xl px-4 py-3" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)" }}>
          <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "#6366f1" }} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
          </svg>
          <p className="text-xs leading-relaxed" style={{ color: "#6b7280" }}>
            생체정보는 기기 내 암호화 저장되며 외부 서버로 전송되지 않습니다.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-sm pb-10 text-center">
        <p className="text-xs" style={{ color: "#374151" }}>
          © 2025 FaceAuth. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
