import { getSupabase, isSupabaseConfigured } from "./supabase";

export interface RankInfo {
  rank: number;
  total: number;
}

/**
 * Seller-safe ranking: the server returns ONLY this shop's position and the number of
 * retailers — never other shops' sales (see public.my_rank / my_peak_rank in the SQL).
 */
export async function fetchMyRank(startMs: number, endMs: number): Promise<RankInfo | null> {
  if (!isSupabaseConfigured) return null;
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("my_rank", {
    p_start: new Date(startMs).toISOString(),
    p_end: new Date(endMs).toISOString(),
  });
  if (error) {
    console.warn("[ranking] my_rank:", error.message);
    return null;
  }
  const row = (Array.isArray(data) ? data[0] : data) as { pos?: number; total?: number } | null;
  if (!row || row.pos == null) return null;
  return { rank: Number(row.pos), total: Number(row.total) };
}

/** Best end-of-day position held during the period (null when no sales yet). */
export async function fetchMyPeakRank(startMs: number, endMs: number): Promise<number | null> {
  if (!isSupabaseConfigured) return null;
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.rpc("my_peak_rank", {
    p_start: new Date(startMs).toISOString(),
    p_end: new Date(endMs).toISOString(),
  });
  if (error) {
    console.warn("[ranking] my_peak_rank:", error.message);
    return null;
  }
  return data == null ? null : Number(data);
}
