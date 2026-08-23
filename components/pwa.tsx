"use client";

import { useEffect } from "react";

export function PWA() {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
