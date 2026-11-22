import { NextResponse } from "next/server";
import { emailUseCases } from "@/src/composition/server";
import { failure, readJson } from "../responses";

export const dynamic = "force-dynamic";

/** A team leaves its email: { session, team, email, consent }. The email is never echoed back. */
export async function POST(request: Request) {
  const result = await emailUseCases.submitEmail(await readJson(request));
  return result.ok ? NextResponse.json({ ok: true }) : failure(result.error);
}
