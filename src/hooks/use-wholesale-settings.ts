"use client";

import { useEffect, useState } from "react";
import { DEFAULT_WHOLESALE_SETTINGS, type WholesaleSettings } from "@/lib/wholesale";

export function useWholesaleSettings() {
  const [settings, setSettings] = useState<WholesaleSettings>(DEFAULT_WHOLESALE_SETTINGS);

  useEffect(() => {
    fetch("/api/wholesale-settings")
      .then((res) => res.json())
      .then((data: WholesaleSettings) => setSettings(data))
      .catch(() => {
        // keep the default — worst case the progress bar's threshold is
        // slightly off until the next successful fetch
      });
  }, []);

  return settings;
}
