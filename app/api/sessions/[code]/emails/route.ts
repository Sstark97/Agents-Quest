import { NextResponse } from "next/server";
import { emailUseCases } from "@/src/composition/server";
import { failure, readJson } from "../../../responses";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ code: string }> };

/** How many emails the session has: { key } → { count }. POST so the key never travels in a URL. */
export async function POST(request: Request, { params }: Context) {
  const result = await emailUseCases.getEmailCount((await params).code, await readJson(request));
  return result.ok ? NextResponse.json({ count: result.count }) : failure(result.error);
}
