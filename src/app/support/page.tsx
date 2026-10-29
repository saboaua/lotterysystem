"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { SupportScreen } from "@/components/SupportScreen";
import { useStore } from "@/lib/store";
import { isBackOffice } from "@/lib/permissions";

/** Support is owner-facing; retailers stay on sell. */
export default function SupportPage() {
  const { user } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.replace("/");
    else if (user.role !== "owner") router.replace(isBackOffice(user) ? "/office" : "/sell");
  }, [user, router]);

  if (!user || user.role !== "owner") return null;
  return (
    <Shell>
      <SupportScreen />
    </Shell>
  );
}
