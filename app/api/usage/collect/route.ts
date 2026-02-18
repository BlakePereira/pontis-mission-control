import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

export const runtime = "nodejs";

const execAsync = promisify(exec);

export async function POST() {
  try {
    const scriptPath =
      "/Users/claraadkinson/.openclaw/workspace/mission-control/scripts/collect-usage.mjs";

    const { stdout, stderr } = await execAsync(`node ${scriptPath}`, {
      timeout: 60000,
    });

    const message = stdout.trim() || stderr.trim() || "Collection complete";

    return NextResponse.json({ ok: true, message });
  } catch (err: unknown) {
    const error = err as Error & { stdout?: string; stderr?: string };
    const message =
      error.stdout?.trim() || error.stderr?.trim() || error.message || "Collection failed";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
