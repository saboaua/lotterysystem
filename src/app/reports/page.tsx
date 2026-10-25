"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { ReportsScreen } from "@/components/ReportsScreen";
import { useStore } from "@/lib/store";

/** Reports live in owner back office only. */
export default function ReportsPage() {
  const { user } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace("/");
    else if (user.role !== "owner") router.replace("/sell");
    else router.replace("/office");
  }, [user, router]);

  if (!user || user.role !== "owner") return null;
  return (
    <Shell>
      <ReportsScreen />
    </Shell>
  );
}
