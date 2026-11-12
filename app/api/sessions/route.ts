import { NextResponse } from "next/server";
import { sessionUseCases } from "@/src/composition/server";
import { failure, readJson } from "../responses";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await readJson<{ name?: unknown }>(request);
  const result = await sessionUseCases.createSession(body?.name);
  return result.ok ? NextResponse.json({ code: result.code, adminKey: result.adminKey, name: result.name }) : failure(result.error);
}
