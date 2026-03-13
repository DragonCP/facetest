"use client";

import { useEffect, useRef, useState } from "react";

export interface DetectionState {
  detected: boolean;
  confidence: number;
  landmarkCount: number;
  descriptor: Float32Array | null;  // 128차원 얼굴 특징 벡터
}

interface Props {
  active?: boolean;
  onDetection?: (state: DetectionState) => void;
  height?: string;
}

// 모듈 레벨 캐시 — 재마운트 시 재로딩 방지
let faceapiCache: typeof import("face-api.js") | null = null;
let modelsLoaded = false;

export default function FaceDetector({ active = true, onDetection, height = "300px" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const activeRef = useRef(active);
  const onDetectionRef = useRef(onDetection);

  const [stage, setStage] = useState<"loading" | "ready" | "error">("loading");
  const [loadMsg, setLoadMsg] = useState("AI 모델 로딩 중...");
  const [errorMsg, setErrorMsg] = useState("");
  const [detected, setDetected] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [landmarkCount, setLandmarkCount] = useState(0);

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { onDetectionRef.current = onDetection; }, [onDetection]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        setLoadMsg("AI 모델 로딩 중...");
        if (!faceapiCache) {
          faceapiCache = await import("face-api.js");
        }
        const faceapi = faceapiCache;

        if (!modelsLoaded) {
          setLoadMsg("얼굴 인식 모델 로딩 중... (최초 1회)");
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
            faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
            faceapi.nets.faceRecognitionNet.loadFromUri("/models"),   // 128-dim descriptor
          ]);
          modelsLoaded = true;
        }

        if (cancelled) return;

        setLoadMsg("카메라 연결 중...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });

        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        await new Promise<void>((res) => { video.onloadeddata = () => res(); });

        if (cancelled) return;
        setStage("ready");

        const options = new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.45, inputSize: 224 });

        const loop = async () => {
          if (cancelled) return;
          const vid = videoRef.current;
          const cvs = canvasRef.current;
          if (!vid || !cvs || vid.readyState < 2) {
            rafRef.current = requestAnimationFrame(loop);
            return;
          }

          if (activeRef.current) {
            // .withFaceDescriptor() 로 128-dim 벡터까지 한 번에 추출
            const result = await faceapi
              .detectSingleFace(vid, options)
              .withFaceLandmarks(true)
              .withFaceDescriptor();

            const ctx = cvs.getContext("2d");
            if (ctx) {
              cvs.width = vid.videoWidth;
              cvs.height = vid.videoHeight;
              ctx.clearRect(0, 0, cvs.width, cvs.height);

              if (result) {
                drawOverlay(ctx, result, cvs.width, cvs.height);
                const conf = Math.round(result.detection.score * 100);
                setDetected(true);
                setConfidence(conf);
                setLandmarkCount(result.landmarks.positions.length);
                onDetectionRef.current?.({
                  detected: true,
                  confidence: conf,
                  landmarkCount: result.landmarks.positions.length,
                  descriptor: result.descriptor,
                });
              } else {
                setDetected(false);
                setConfidence(0);
                setLandmarkCount(0);
                onDetectionRef.current?.({ detected: false, confidence: 0, landmarkCount: 0, descriptor: null });
              }
            }
          } else {
            const ctx = canvasRef.current?.getContext("2d");
            if (ctx) ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
          }

          rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setErrorMsg(
          msg.includes("Permission") || msg.includes("NotAllowed")
            ? "카메라 권한이 거부되었습니다.\n브라우저 설정에서 허용해 주세요."
            : msg.includes("NotFound") || msg.includes("Devices")
              ? "카메라를 찾을 수 없습니다."
              : "초기화 실패: " + msg
        );
        setStage("error");
      }
    }

    init();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // ── 캔버스 드로잉 ──────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function drawOverlay(ctx: CanvasRenderingContext2D, result: any, W: number, H: number) {
    const { detection, landmarks } = result;
    const imgW = detection._imageDims.width;
    const imgH = detection._imageDims.height;
    const sx = W / imgW;
    const sy = H / imgH;

    const box = detection.box;
    const bx = box.x * sx, by = box.y * sy;
    const bw = box.width * sx, bh = box.height * sy;

    // ① 바운딩 박스
    ctx.save();
    ctx.shadowColor = "#3b82f6";
    ctx.shadowBlur = 12;
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.restore();

    // ② 코너 마커
    const cL = Math.min(18, bw * 0.18);
    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ([
      [bx, by + cL, bx, by, bx + cL, by],
      [bx + bw - cL, by, bx + bw, by, bx + bw, by + cL],
      [bx, by + bh - cL, bx, by + bh, bx + cL, by + bh],
      [bx + bw - cL, by + bh, bx + bw, by + bh, bx + bw, by + bh - cL],
    ] as [number, number, number, number, number, number][]).forEach(([x1, y1, x2, y2, x3, y3]) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.stroke();
    });

    // ③ 신뢰도 라벨
    const score = Math.round(detection.score * 100);
    const lx = bx;
    const ly = by > 24 ? by - 24 : by + 4;
    ctx.fillStyle = "rgba(37,99,235,0.85)";
    rrect(ctx, lx, ly, 84, 20, 4); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 11px Arial";
    ctx.fillText(`✓ ${score}% 감지됨`, lx + 5, ly + 14);

    // ④ 랜드마크 라인
    const pts = landmarks.positions.map((p: { x: number; y: number }) => ({ x: p.x * sx, y: p.y * sy }));
    const path = (idxs: number[], close = false) => {
      if (idxs.length < 2) return;
      ctx.beginPath(); ctx.moveTo(pts[idxs[0]].x, pts[idxs[0]].y);
      for (let i = 1; i < idxs.length; i++) ctx.lineTo(pts[idxs[i]].x, pts[idxs[i]].y);
      if (close) ctx.closePath(); ctx.stroke();
    };
    ctx.strokeStyle = "rgba(96,165,250,0.55)"; ctx.lineWidth = 1;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    path(r(0, 16)); path(r(17, 21)); path(r(22, 26)); path(r(27, 30));
    path([30, 31, 32, 33, 34, 35, 30]);
    path([36, 37, 38, 39, 40, 41, 36], true);
    path([42, 43, 44, 45, 46, 47, 42], true);
    path([48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 48], true);
    path([60, 61, 62, 63, 64, 65, 66, 67, 60], true);

    // ⑤ 랜드마크 점
    pts.forEach((pt: { x: number; y: number }, i: number) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, i >= 36 && i <= 47 ? 2 : 1.5, 0, Math.PI * 2);
      ctx.fillStyle = i >= 36 && i <= 47 ? "rgba(186,230,253,0.95)" : "rgba(147,197,253,0.8)";
      ctx.fill();
    });
  }

  // ── 렌더 ──────────────────────────────────────────────────────────
  return (
    <div className="relative w-full overflow-hidden rounded-3xl" style={{ height }}>

      {/* video / canvas: 항상 DOM에 존재해야 ref가 연결됨 */}
      <video ref={videoRef} autoPlay muted playsInline
        className="absolute inset-0 h-full w-full object-cover"
        style={{ transform: "scaleX(-1)", visibility: stage === "ready" ? "visible" : "hidden" }} />
      <canvas ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ transform: "scaleX(-1)", visibility: stage === "ready" ? "visible" : "hidden" }} />

      {/* 로딩 */}
      {stage === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
          style={{ background: "rgba(9,9,15,0.97)", border: "1.5px solid rgba(99,102,241,0.2)" }}>
          <div className="relative h-12 w-12">
            <svg className="animate-spin-slow absolute inset-0" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="20" stroke="rgba(99,102,241,0.2)" strokeWidth="3" />
              <circle cx="24" cy="24" r="20" stroke="#6366f1" strokeWidth="3"
                strokeLinecap="round" strokeDasharray="40 88" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="h-5 w-5" style={{ color: "#818cf8" }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
              </svg>
            </div>
          </div>
          <p className="text-sm font-medium" style={{ color: "#818cf8" }}>{loadMsg}</p>
          <p className="text-xs" style={{ color: "#374151" }}>최초 로딩 시 약 10초 소요</p>
        </div>
      )}

      {/* 에러 */}
      {stage === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center"
          style={{ background: "rgba(9,9,15,0.97)", border: "1.5px solid rgba(239,68,68,0.25)" }}>
          <div className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <svg className="h-5 w-5" style={{ color: "#f87171" }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p className="whitespace-pre-line text-sm" style={{ color: "#fca5a5" }}>{errorMsg}</p>
        </div>
      )}

      {/* 카메라 활성 UI */}
      {stage === "ready" && (
        <>
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{
                background: detected ? "rgba(16,185,129,0.25)" : "rgba(0,0,0,0.55)",
                border: `1px solid ${detected ? "rgba(52,211,153,0.5)" : "rgba(255,255,255,0.12)"}`,
                color: detected ? "#6ee7b7" : "#9ca3af",
                backdropFilter: "blur(8px)",
              }}>
              <div className="h-1.5 w-1.5 rounded-full"
                style={{
                  background: detected ? "#10b981" : "#6b7280",
                  boxShadow: detected ? "0 0 6px #10b981" : "none",
                  animation: detected ? "pulse 1.2s ease-in-out infinite" : "none",
                }} />
              {detected ? "얼굴 감지됨" : "얼굴 감지 중..."}
            </div>
            {detected && (
              <div className="rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{ background: "rgba(37,99,235,0.35)", border: "1px solid rgba(96,165,250,0.4)", color: "#93c5fd", backdropFilter: "blur(8px)" }}>
                신뢰도 {confidence}%
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2.5"
            style={{ background: "linear-gradient(to top, rgba(9,9,15,0.9), transparent)" }}>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: "#6366f1" }} />
              <span className="text-xs" style={{ color: "#6b7280" }}>LIVE</span>
            </div>
            {detected && (
              <span className="text-xs" style={{ color: "#4b5563" }}>특징점 {landmarkCount}개 · 128차원 벡터 추출</span>
            )}
            <div className="flex items-center gap-1.5">
              <svg className="h-3 w-3" style={{ color: "#4b5563" }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
              <span className="text-xs" style={{ color: "#374151" }}>암호화</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function r(s: number, e: number) { return Array.from({ length: e - s + 1 }, (_, i) => i + s); }
function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rad: number) {
  ctx.beginPath();
  ctx.moveTo(x + rad, y); ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}
