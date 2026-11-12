"use client";
import { useEffect, useState } from "react";
import { useServices } from "@/src/ui/services-context";

/**
 * Session a public screen is about: the `?s=` code of the URL or, without it, the joined session.
 * Null until the component has mounted; "" when there is no session at all.
 */
export function useSessionCode() {
  const { membership } = useServices();
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("s");
    setCode((fromUrl ?? membership.current()?.code ?? "").toUpperCase());
  }, [membership]);
  return code;
}
