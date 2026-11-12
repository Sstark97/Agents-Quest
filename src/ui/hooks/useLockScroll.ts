"use client";
import { useEffect } from "react";

/** Blocks page scrolling while a dialog is open. */
export function useLockScroll() {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);
}
