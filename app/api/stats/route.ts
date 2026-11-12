import { NextResponse } from "next/server";
import { scoreUseCases } from "@/src/composition/server";
import { failure } from "../responses";

export const dynamic = "force-dynamic";

/** Most common mistakes of a session (for the facilitator debrief and the projector screen). */
export async function GET(request: Request) {
  const result = await scoreUseCases.getStats(new URL(request.url).searchParams.get("session") ?? "");
  return result.ok ? NextResponse.json(result.stats) : failure(result.error);
}
