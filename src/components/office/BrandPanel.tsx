"use client";

import { useState } from "react";
import { useStore } from "@/lib/store";
import { BulletinEditor } from "./BulletinEditor";
import { removeLogo, uploadLogo } from "@/lib/storage";

type Mode = "brand" | "bulletin" | "all";

export function BrandPanel({ mode = "all" }: { mode?: Mode }) {
  const { brand, updateBrand, toast } = useStore();
  const [uploading, setUploading] = useState(false);

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
      toast("Logo saved");
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

  return (
    <div className="space-y-4">
      {showBrand && (
        <div className="mx-auto max-w-5xl space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-sm">
          <h2 className="text-lg font-bold">Branding</h2>

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
              Logo (back office & login)
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
                className={`cursor-pointer rounded-full bg-indigo-600 px-4 py-2 text-xs font-bold text-white ${
                  uploading ? "opacity-60 pointer-events-none" : ""
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
              Max 400KB. When Supabase is configured, logos are stored in the public{" "}
              <code className="rounded bg-[var(--key)] px-1">logos</code> bucket; otherwise they stay
              as local data URLs.
            </p>
          </div>

          <p className="text-[11px] text-[var(--mut)]">Name, tagline and logo save automatically.</p>
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
