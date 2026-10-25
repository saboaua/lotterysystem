"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { OfficeScreen } from "@/components/OfficeScreen";
import { useStore } from "@/lib/store";

/** Owner back office only. Retailers are sent to sell. */
export default function OfficePage() {
  const { user } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace("/");
    else if (user.role !== "owner") router.replace("/sell");
  }, [user, router]);

  if (!user || user.role !== "owner") return null;
  return (
    <Shell>
      <OfficeScreen />
    </Shell>
  );
}
