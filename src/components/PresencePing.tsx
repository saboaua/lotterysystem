"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

/** Runs while sell (or any POS) screen is mounted — shop pings base at configured frequency. */
export function PresencePing() {
  const { user, selectedRetailerId, brand, pingRetailer } = useStore();

  useEffect(() => {
    if (!user) return;
    const retailerId =
      user.role === "retailer" && user.retailer_id
        ? user.retailer_id
        : selectedRetailerId;
    if (!retailerId) return;

    const sec = Math.max(15, brand.ping_interval_sec ?? 60);
    pingRetailer(retailerId);
    const id = window.setInterval(() => pingRetailer(retailerId), sec * 1000);
    return () => window.clearInterval(id);
  }, [user, selectedRetailerId, brand.ping_interval_sec, pingRetailer]);

  return null;
}
