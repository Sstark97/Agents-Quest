import { NextResponse } from "next/server";
import { sessionUseCases } from "@/src/composition/server";
import { failure, readJson } from "../../responses";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ code: string }> };

export async function GET(_request: Request, { params }: Context) {
  const result = await sessionUseCases.findSession((await params).code);
  return result.ok ? NextResponse.json(result.session) : failure(result.error);
}

/** Facilitator actions: { key, action: "close" | "open" | "reset" | "delete" | "unlock", level } (unlock opens levels 1..level). */
export async function POST(request: Request, { params }: Context) {
  const result = await sessionUseCases.runFacilitatorAction((await params).code, await readJson(request));
  return result.ok ? NextResponse.json({ ok: true }) : failure(result.error);
}
