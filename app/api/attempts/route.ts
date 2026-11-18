import { NextResponse } from "next/server";
import { scoreUseCases } from "@/src/composition/server";
import { failure, readJson } from "../responses";

export const dynamic = "force-dynamic";

/** A team opens a level: { session, team, game }. Answers the attempt it just used and the limit. */
export async function POST(request: Request) {
  const result = await scoreUseCases.startAttempt(await readJson(request));
  return result.ok ? NextResponse.json({ attempt: result.attempt, limit: result.limit }) : failure(result.error);
}

/** Read-only status of a team in every level: ?session=&team=. Answers { status } (null in sessions without attempt limit). */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const result = await scoreUseCases.getPlayStatus({ session: params.get("session"), team: params.get("team") });
  return result.ok ? NextResponse.json({ status: result.status }) : failure(result.error);
}
