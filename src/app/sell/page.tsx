"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import SellScreen from "@/components/SellScreen";
import { useStore } from "@/lib/store";

/** Retailer sell terminal only. Owners are sent to back office. */
export default function SellPage() {
  const { user } = useStore();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/");
    else if (user.role === "owner") router.replace("/office");
  }, [user, router, ready]);

  if (!ready || !user || user.role === "owner") {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-900">
        Loading terminal…
      </div>
    );
  }

  return (
    <Shell>
      <SellScreen />
    </Shell>
  );
}
