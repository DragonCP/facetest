import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(url, key);

export function isSupabaseConfigured(): boolean {
  return url.startsWith("https://") && key.length > 10;
}

// ── 타입 ────────────────────────────────────────────────────────────
export interface FaceRecord {
  id: string;
  name: string;
  descriptor: number[];   // DB에는 float8[] (일반 숫자 배열)
  created_at: string;
}

// ── DB 操作 ─────────────────────────────────────────────────────────

/** 얼굴 등록 */
export async function saveFace(
  name: string,
  descriptor: Float32Array
): Promise<FaceRecord> {
  const { data, error } = await supabase
    .from("face_data")
    .insert({ name: name.trim(), descriptor: Array.from(descriptor) })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as FaceRecord;
}

/** 전체 얼굴 목록 로드 */
export async function getAllFaces(): Promise<FaceRecord[]> {
  const { data, error } = await supabase
    .from("face_data")
    .select("id, name, descriptor, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as FaceRecord[];
}

/** 특정 이름의 얼굴 삭제 */
export async function deleteFaceById(id: string): Promise<void> {
  const { error } = await supabase.from("face_data").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── 유사도 계산 ─────────────────────────────────────────────────────

/**
 * 유클리드 거리 → 일치율(%) 변환
 *  - distance 0.0  →  100%
 *  - distance 0.10 →   90%  (90% 인증 기준선)
 *  - distance 0.50 →   50%
 *  - distance 1.0+ →    0%
 */
export function distanceToMatchRate(distance: number): number {
  return Math.round(Math.max(0, Math.min(100, (1 - distance) * 100)));
}

/**
 * 현재 얼굴 descriptor와 등록된 얼굴 목록을 비교해 최고 일치 결과 반환
 */
export function findBestMatch(
  current: Float32Array,
  records: FaceRecord[]
): { record: FaceRecord; matchRate: number; distance: number } | null {
  if (!records.length) return null;

  let best: FaceRecord | null = null;
  let bestDist = Infinity;

  const cur = Array.from(current);

  for (const rec of records) {
    const stored = rec.descriptor;
    // 유클리드 거리 계산
    let sum = 0;
    for (let i = 0; i < cur.length; i++) {
      const d = cur[i] - stored[i];
      sum += d * d;
    }
    const dist = Math.sqrt(sum);
    if (dist < bestDist) {
      bestDist = dist;
      best = rec;
    }
  }

  if (!best) return null;
  return {
    record: best,
    matchRate: distanceToMatchRate(bestDist),
    distance: bestDist,
  };
}
