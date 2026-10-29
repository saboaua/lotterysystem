"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { ReportsScreen } from "@/components/ReportsScreen";
import { useStore } from "@/lib/store";
import { can, isBackOffice } from "@/lib/permissions";

/** Reports live in owner back office only. */
export default function ReportsPage() {
  const { user } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace("/");
    else if (!can(user, "reports:view")) router.replace(isBackOffice(user) ? "/office" : "/sell");
    else router.replace("/office");
  }, [user, router]);

  if (!user || !can(user, "reports:view")) return null;
  return (
    <Shell>
      <ReportsScreen />
    </Shell>
  );
}
