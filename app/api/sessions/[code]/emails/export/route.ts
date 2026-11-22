import { NextResponse } from "next/server";
import { emailUseCases } from "@/src/composition/server";
import { failure, readJson } from "../../../../responses";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ code: string }> };

/** The CSV of the session: { key } → { fileName, csv }. POST so the key never travels in a URL. */
export async function POST(request: Request, { params }: Context) {
  const result = await emailUseCases.exportEmails((await params).code, await readJson(request));
  return result.ok ? NextResponse.json({ fileName: result.fileName, csv: result.csv }) : failure(result.error);
}
