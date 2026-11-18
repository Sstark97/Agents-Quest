import { NextResponse } from "next/server";
import { scoreUseCases } from "@/src/composition/server";
import { failure, readJson } from "../responses";

export const dynamic = "force-dynamic";

/** A team opens a level: { session, team, game }. Answers the attempt it just used and the limit. */
export async function POST(request: Request) {
  const result = await scoreUseCases.startAttempt(await readJson(request));
  return result.ok ? NextResponse.json({ attempt: result.attempt, limit: result.limit }) : failure(result.error);
}
