"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Fire-and-forget page view beacon, one per navigation — feeds the
 * "Visitas" numbers on the admin dashboard. Skips /admin so the owner's
 * own visits don't inflate the count of actual shoppers. */
export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
      keepalive: true,
    }).catch(() => {
      // best-effort — a missed beacon just means one uncounted visit
    });
  }, [pathname]);

  return null;
}
