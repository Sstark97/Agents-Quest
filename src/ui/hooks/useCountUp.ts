"use client";
import { useEffect, useState } from "react";

/** Number that animates up to `target`. */
export function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const startedAt = performance.now();
    const id = setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / durationMs);
      setValue(Math.round(target * progress));
      if (progress >= 1) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [target, durationMs]);
  return value;
}
