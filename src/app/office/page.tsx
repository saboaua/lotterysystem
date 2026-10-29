"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { OfficeScreen } from "@/components/OfficeScreen";
import { useStore } from "@/lib/store";
import { isBackOffice } from "@/lib/permissions";

/** Owner back office only. Retailers are sent to sell. */
export default function OfficePage() {
  const { user } = useStore();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  // Wait one tick so login state from the previous page can commit
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/");
    else if (!isBackOffice(user)) router.replace("/sell");
  }, [user, router, ready]);

  if (!ready || !user || !isBackOffice(user)) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-900">
        Loading back office…
      </div>
    );
  }

  return (
    <Shell>
      <OfficeScreen />
    </Shell>
  );
}
