import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scanId = searchParams.get("scan_id");

  // Get scan (latest if no ID provided)
  let scan;
  if (scanId) {
    const { data } = await supabase
      .from("security_scans")
      .select("*")
      .eq("id", scanId)
      .single();
    scan = data;
  } else {
    const { data } = await supabase
      .from("security_scans")
      .select("*")
      .eq("status", "complete")
      .order("scanned_at", { ascending: false })
      .limit(1)
      .single();
    scan = data;
  }

  if (!scan) return NextResponse.json({ scan: null, findings: [] });

  const { data: findings } = await supabase
    .from("security_findings")
    .select("*")
    .eq("scan_id", scan.id)
    .order("finding_number", { ascending: true });

  return NextResponse.json({ scan, findings: findings || [] });
}
