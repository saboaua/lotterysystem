"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { BulletinEditor } from "./BulletinEditor";
import { removeLogo, uploadLogo } from "@/lib/storage";
import { THEME_PRESETS, applyThemePreset, type ThemePresetId } from "@/lib/theme";

type Mode = "brand" | "bulletin" | "all";

export function BrandPanel({ mode = "all" }: { mode?: Mode }) {
  const { brand, updateBrand, toast } = useStore();
  const [uploading, setUploading] = useState(false);
  const [welcome, setWelcome] = useState(brand.login_welcome || "");
  const [subtitle, setSubtitle] = useState(brand.login_subtitle || "");

  useEffect(() => {
    setWelcome(brand.login_welcome || "");
    setSubtitle(brand.login_subtitle || "");
  }, [brand.login_welcome, brand.login_subtitle]);

  useEffect(() => {
    applyThemePreset(brand.theme_id);
  }, [brand.theme_id]);

  async function onLogoUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadLogo(file, "brand", "logo");
      if (!result.ok) {
        toast(result.error, true);
        return;
      }
      void removeLogo(brand.logo);
      updateBrand({ logo: result.url });
      toast("Logo saved — shown on login and back office");
    } finally {
      setUploading(false);
    }
  }

  async function onLogoRemove() {
    void removeLogo(brand.logo);
    updateBrand({ logo: "" });
    toast("Logo removed");
  }

  const showBrand = mode === "brand" || mode === "all";
  const showBulletin = mode === "bulletin" || mode === "all";
  const themeId = (brand.theme_id as ThemePresetId) || "violet";

  return (
    <div className="space-y-4">
      {showBrand && (
        <div className="mx-auto max-w-5xl space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-bold">Branding</h2>
            <p className="text-xs text-[var(--mut)]">
              Name, logo, login copy, and back-office colour scheme. Changes sync via settings.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-[11px] font-semibold text-[var(--mut)]">
              Lottery name
              <input
                className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
                defaultValue={brand.name}
                onBlur={(e) => updateBrand({ name: e.target.value })}
              />
            </label>
            <label className="text-[11px] font-semibold text-[var(--mut)]">
              Tagline
              <input
                className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--key)] px-3 text-sm"
                defaultValue={brand.tagline}
                onBlur={(e) => updateBrand({ tagline: e.target.value })}
              />
            </label>
          </div>

          <div className="rounded-xl border border-[var(--line)] bg-[var(--key)]/50 p-3">
            <div className="mb-2 text-[11px] font-bold uppercase text-[var(--mut)]">
              Company logo (login + back office)
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {brand.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brand.logo}
                  alt=""
                  className="h-14 w-14 rounded-xl border border-[var(--line)] bg-white object-contain p-1"
                />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-extrabold text-white">
                  SL
                </div>
              )}
              <label
                className={`cursor-pointer rounded-full bg-[var(--accent,#7c3aed)] px-4 py-2 text-xs font-bold text-white ${
                  uploading ? "pointer-events-none opacity-60" : ""
                }`}
              >
                {uploading ? "Uploading…" : "Upload logo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    void onLogoUpload(f);
                  }}
                />
              </label>
              {brand.logo && (
                <button
                  type="button"
                  className="text-xs font-semibold text-rose-600"
                  onClick={() => void onLogoRemove()}
                >
                  Remove
                </button>
              )}
            </div>
            <p className="mt-2 text-[10px] text-[var(--mut)]">
              Square PNG/JPG works best (max ~400KB). Shown on the login screen and in the back-office header.
            </p>
          </div>

          <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--key)]/40 p-3">
            <div className="text-[11px] font-bold uppercase text-[var(--mut)]">Login page text</div>
            <label className="block text-[11px] font-semibold text-[var(--mut)]">
              Welcome heading
              <input
                className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                value={welcome}
                placeholder={brand.name || "Welcome back"}
                onChange={(e) => setWelcome(e.target.value)}
                onBlur={() => updateBrand({ login_welcome: welcome.trim() })}
              />
            </label>
            <label className="block text-[11px] font-semibold text-[var(--mut)]">
              Subtitle
              <input
                className="mt-1 h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--card)] px-3 text-sm"
                value={subtitle}
                placeholder={brand.tagline || "Sign in to continue"}
                onChange={(e) => setSubtitle(e.target.value)}
                onBlur={() => updateBrand({ login_subtitle: subtitle.trim() })}
              />
            </label>
            <p className="text-[10px] text-[var(--mut)]">
              Leave blank to use the lottery name and tagline on the login screen.
            </p>
          </div>

          <div>
            <div className="mb-2 text-[11px] font-bold uppercase text-[var(--mut)]">
              Back-office colour scheme
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {THEME_PRESETS.map((p) => {
                const on = themeId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      updateBrand({ theme_id: p.id });
                      applyThemePreset(p.id);
                      toast(`Theme: ${p.label}`);
                    }}
                    className={
                      "rounded-2xl border p-3 text-left transition " +
                      (on
                        ? "border-[var(--accent)] ring-2 ring-[var(--accent)]"
                        : "border-[var(--line)] hover:border-slate-300")
                    }
                  >
                    <div className="mb-2 flex gap-1">
                      <span className="h-6 w-6 rounded-full shadow-sm" style={{ background: p.primary }} />
                      <span className="h-6 flex-1 rounded-full" style={{ background: p.soft }} />
                    </div>
                    <div className="text-xs font-bold">{p.label}</div>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] text-[var(--mut)]">
              Accent colours apply to active tabs and primary actions. Prefer a single preset rather than
              one-off hex values so contrast stays consistent.
            </p>
          </div>

          <p className="text-[11px] text-[var(--mut)]">Name, logo, and theme save automatically to cloud settings.</p>
        </div>
      )}

      {showBulletin && (
        <div className="mx-auto max-w-5xl">
          <BulletinEditor />
        </div>
      )}
    </div>
  );
}
