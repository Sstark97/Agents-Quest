"use client";
import { useEffect, useState } from "react";
import { useServices } from "@/src/ui/services-context";

/** Robot chosen on this device (0 until the component has mounted). */
export function useAvatar() {
  const { profile } = useServices();
  const [avatar, setAvatar] = useState(0);
  useEffect(() => setAvatar(profile.avatar()), [profile]);
  return avatar;
}
