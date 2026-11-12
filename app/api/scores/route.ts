import { NextResponse } from "next/server";
import { scoreUseCases, storageIsPersistent } from "@/src/composition/server";
import { failure, readJson } from "../responses";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result = await scoreUseCases.getRanking(new URL(request.url).searchParams.get("session") ?? "");
  if (!result.ok) return failure(result.error);
  return NextResponse.json({ session: result.session, teams: result.teams, persistent: storageIsPersistent });
}

export async function POST(request: Request) {
  const result = await scoreUseCases.submitScore(await readJson(request));
  return result.ok ? NextResponse.json({ ok: true }) : failure(result.error);
}
