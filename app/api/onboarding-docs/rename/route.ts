import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "onboarding-docs";

const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

// Rename via Supabase move endpoint
export async function POST(req: NextRequest) {
  try {
    const { oldName, newName } = await req.json();
    if (!oldName || !newName) {
      return NextResponse.json({ error: "oldName and newName required" }, { status: 400 });
    }

    const moveRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/move`,
      {
        method: "POST",
        headers: sbHeaders,
        body: JSON.stringify({
          bucketId: BUCKET,
          sourceKey: oldName,
          destinationKey: newName,
        }),
      }
    );

    if (!moveRes.ok) {
      const err = await moveRes.text();
      return NextResponse.json({ error: `Move failed: ${err}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, newName });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
