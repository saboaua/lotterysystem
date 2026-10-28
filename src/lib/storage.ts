import { getSupabase, isSupabaseConfigured } from "./supabase";

const BUCKET = "logos";
const MAX_BYTES = 400_000;

/** MIME types allowed by the logos bucket (must match supabase/storage.sql). */
const ALLOWED_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function resolveMimeAndExt(
  file: File
): { contentType: string; ext: string } | { error: string } {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  const byExt: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
  };

  let contentType = (file.type || "").toLowerCase();
  if (contentType === "image/jpg") contentType = "image/jpeg";

  if (contentType && ALLOWED_MIME[contentType]) {
    return { contentType, ext: ALLOWED_MIME[contentType] };
  }

  if (fromName && byExt[fromName]) {
    return {
      contentType: byExt[fromName],
      ext: fromName === "jpeg" ? "jpg" : fromName,
    };
  }

  return {
    error: `Unsupported image type (${file.type || fromName || "unknown"}). Use PNG, JPEG, WebP, GIF or SVG.`,
  };
}

/** True when the URL points at our Supabase logos bucket. */
export function isStorageLogoUrl(url: string | undefined | null): boolean {
  if (!url || url.startsWith("data:")) return false;
  return url.includes(`/storage/v1/object/public/${BUCKET}/`);
}

/**
 * Upload a logo image.
 * - When Supabase is configured: stores in the public `logos` bucket and returns the public URL.
 * - Demo / offline only: returns a base64 data URL.
 *
 * Does NOT silently fall back to data URLs when Supabase is on — errors are returned so the UI can show them.
 */
export async function uploadLogo(
  file: File,
  folder: string,
  id: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Logo max 400KB" };
  }

  const mime = resolveMimeAndExt(file);
  if ("error" in mime) return { ok: false, error: mime.error };

  const contentType = mime.contentType;
  const ext = mime.ext;

  const sb = getSupabase();
  if (!isSupabaseConfigured || !sb) {
    try {
      const url = await fileToDataUrl(file);
      return { ok: true, url };
    } catch {
      return { ok: false, error: "Could not read image" };
    }
  }

  // Must be signed in — Storage write policies are for role `authenticated`
  const { data: sessionData } = await sb.auth.getSession();
  if (!sessionData.session) {
    return {
      ok: false,
      error:
        "Sign in with a Supabase account to upload logos (demo login cannot write to Storage).",
    };
  }

  const safeFolder = folder.replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "misc";
  const safeId = id.replace(/[^a-z0-9_-]/gi, "_").toLowerCase() || "logo";
  const path = `${safeFolder}/${safeId}.${ext}`;

  const body = await file.arrayBuffer();

  async function tryUpload(upsert: boolean) {
    return sb.storage.from(BUCKET).upload(path, body, {
      upsert,
      contentType,
      cacheControl: "3600",
    });
  }

  let { error } = await tryUpload(true);

  // Conflict / upsert quirks: delete then insert once
  if (error && /exists|duplicate|already|409|400/i.test(error.message)) {
    await sb.storage.from(BUCKET).remove([path]);
    ({ error } = await tryUpload(false));
  }

  if (error) {
    console.warn("[storage] upload failed:", error.message, { path, contentType });
    return {
      ok: false,
      error: error.message || "Upload failed",
    };
  }

  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
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
