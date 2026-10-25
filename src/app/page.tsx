"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginScreen } from "@/components/LoginScreen";
import { useStore } from "@/lib/store";

export default function Home() {
  const { user } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    router.replace(user.role === "owner" ? "/office" : "/sell");
  }, [user, router]);

  if (user) return null;
  return <LoginScreen />;
}
