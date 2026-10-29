"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { AuditPanel } from "@/components/office/AuditPanel";
import { useStore } from "@/lib/store";
import { can, isBackOffice } from "@/lib/permissions";

/** Audit trail: owner, or staff whose role has the "Audit trail" permission. */
export default function AuditPage() {
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
    else if (!can(user, "audit:view")) router.replace(isBackOffice(user) ? "/office" : "/sell");
  }, [user, router, ready]);

  if (!ready || !user || !can(user, "audit:view")) {
    return (
      <div className="grid min-h-dvh place-items-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-900">
        Loading audit trail…
      </div>
    );
  }

  return (
    <Shell>
      <div className="h-full overflow-auto bg-slate-50 dark:bg-slate-950">
        <AuditPanel />
      </div>
    </Shell>
  );
}
