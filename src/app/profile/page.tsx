"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { ProfileScreen } from "@/components/ProfileScreen";
import { useStore } from "@/lib/store";

/** Retailer profile: shop info, weekly ranking and settlement. Owners go to back office. */
export default function ProfilePage() {
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
        Loading profile…
      </div>
    );
  }

  return (
    <Shell>
      <ProfileScreen />
    </Shell>
  );
}
