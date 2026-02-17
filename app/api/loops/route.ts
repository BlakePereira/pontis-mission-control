import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "data", "open-loops.md");
    const content = await fs.readFile(filePath, "utf-8");
    return NextResponse.json({ content });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message, content: "" }, { status: 200 });
  }
}
