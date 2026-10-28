import { getSupabase, isSupabaseConfigured } from "./supabase";

const BUCKET = "logos";
const MAX_BYTES = 400_000;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function extFromFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,5}$/.test(fromName)) return fromName;
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
  };
  return map[file.type] || "png";
}

/** True when the URL points at our Supabase logos bucket. */
export function isStorageLogoUrl(url: string | undefined | null): boolean {
  if (!url || url.startsWith("data:")) return false;
  return url.includes(`/storage/v1/object/public/${BUCKET}/`);
}

/**
 * Upload a logo image.
 * - When Supabase is configured: stores in the public `logos` bucket and returns the public URL.
 * - Demo / offline: returns a base64 data URL (same as before).
 *
 * `folder` examples: "brand", "games", "fastplay"
 * `id` is the object name stem (e.g. game id or "logo").
 */
export async function uploadLogo(
  file: File,
  folder: string,
  id: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "File must be an image" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Logo max 400KB" };
  }

  const sb = getSupabase();
  if (!isSupabaseConfigured || !sb) {
    try {
      const url = await fileToDataUrl(file);
      return { ok: true, url };
    } catch {
      return { ok: false, error: "Could not read image" };
    }
  }

  const safeFolder = folder.replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "misc";
  const safeId = id.replace(/[^a-z0-9_-]/gi, "_").toLowerCase() || "logo";
  const ext = extFromFile(file);
  const path = `${safeFolder}/${safeId}.${ext}`;

  const { error } = await sb.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || `image/${ext}`,
    cacheControl: "3600",
  });

  if (error) {
    // Bucket missing or RLS — fall back so the UI still works
    console.warn("[storage] upload failed, using data URL:", error.message);
    try {
      const url = await fileToDataUrl(file);
      return { ok: true, url };
    } catch {
      return { ok: false, error: error.message || "Upload failed" };
    }
  }

  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  // Cache-bust so the browser picks up a replaced logo
  const url = `${data.publicUrl}?t=${Date.now()}`;
  return { ok: true, url };
}

/** Best-effort delete from the logos bucket when the stored value is a Storage URL. */
export async function removeLogo(url: string | undefined | null): Promise<void> {
  if (!isStorageLogoUrl(url)) return;
  const sb = getSupabase();
  if (!sb) return;

  try {
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const idx = url!.indexOf(marker);
    if (idx < 0) return;
    let path = url!.slice(idx + marker.length);
    const q = path.indexOf("?");
    if (q >= 0) path = path.slice(0, q);
    path = decodeURIComponent(path);
    if (!path) return;
    await sb.storage.from(BUCKET).remove([path]);
  } catch (e) {
    console.warn("[storage] remove failed:", e);
  }
}
