"use client";
import { useEffect, useState } from "react";
import { useServices } from "@/src/ui/services-context";

/** Team name stored on this device (empty until the component has mounted). */
export function useTeamName() {
  const { profile } = useServices();
  const [team, setTeam] = useState("");
  useEffect(() => setTeam(profile.teamName()), [profile]);
  return team;
}
