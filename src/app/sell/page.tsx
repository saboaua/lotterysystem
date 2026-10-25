"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import SellScreen from "@/components/SellScreen";
import { useStore } from "@/lib/store";

/** Retailer sell terminal only. Owners are sent to back office. */
export default function SellPage() {
  const { user } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace("/");
    else if (user.role === "owner") router.replace("/office");
  }, [user, router]);

  if (!user || user.role === "owner") return null;
  return (
    <Shell>
      <SellScreen />
    </Shell>
  );
}
