import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { finding_id } = await req.json();

  const { data: finding } = await supabase
    .from("security_findings")
    .select("*")
    .eq("id", finding_id)
    .single();

  if (!finding)
    return NextResponse.json({ error: "Finding not found" }, { status: 404 });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `Provide a deep-dive analysis on this security finding for the Pontis codebase (memorial tech company - handles grief data, QR medallions on headstones, family PII):

Finding #${finding.finding_number}: ${finding.title}
Severity: ${finding.severity}
Lens: ${finding.lens}
Description: ${finding.description}
Affected files: ${finding.affected_files?.join(", ")}
Remediation: ${finding.remediation}

Please provide:
1. **Root Cause Analysis** - Why does this vulnerability exist? What architectural decision led to it?
2. **Attack Scenario** - Walk through exactly how an attacker would exploit this, step by step
3. **Evidence** - What specific code patterns, missing checks, or misconfigurations demonstrate this?
4. **Fix** - Provide the exact code change or configuration needed to resolve this
5. **Verification** - How to confirm the fix worked?

Be specific to Pontis's context.`,
        },
      ],
    }),
  });
  const data = await res.json();
  return NextResponse.json({
    deep_dive: data.content?.[0]?.text || "Unable to generate deep dive.",
  });
}
