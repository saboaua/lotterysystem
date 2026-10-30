"use client";

import { useSearchParams } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { Suspense } from "react";
import { countryLabel } from "@/lib/geo";

function BlockedInner() {
  const sp = useSearchParams();
  const code = (sp.get("c") || "").toUpperCase();
  const name = code && code !== "UNKNOWN" ? countryLabel(code) : null;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 p-6 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/50">
          <ShieldOff size={28} />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Region not available</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          This lottery system is restricted to authorised locations. Access from your network has been
          blocked and the attempt was logged.
        </p>
        {name && (
          <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 dark:bg-slate-800">
            Detected region: {name} ({code})
          </p>
        )}
        <p className="mt-4 text-[11px] text-slate-400">
          If you believe this is an error, contact the system owner from an authorised location.
        </p>
      </div>
    </div>
  );
}

export default function BlockedPage() {
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center text-sm text-slate-500">…</div>}>
      <BlockedInner />
    </Suspense>
  );
}
