"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { ReportsScreen } from "@/components/ReportsScreen";
import { useStore } from "@/lib/store";

export default function ReportsPage() {
  const { user } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace("/");
  }, [user, router]);

  if (!user) return null;
  return (
    <Shell>
      <ReportsScreen />
    </Shell>
  );
}
