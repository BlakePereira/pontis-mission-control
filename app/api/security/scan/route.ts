import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const REPO = "Pontis-life/pontis-life-956085e2";

// Fetch file list from GitHub
async function getRepoFiles(): Promise<Array<{ path: string; url: string }>> {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/git/trees/HEAD?recursive=1`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "User-Agent": "PontisSecurityCouncil",
      },
    }
  );
  const data = await res.json();
  const tree = data.tree || [];

  const priorityPatterns = [
    /^(app\/api|lib|utils|middleware|supabase)\//,
    /\.(ts|tsx|js|jsx|sql|env\.example)$/,
  ];
  const sensitiveKeywords = [
    "auth",
    "token",
    "key",
    "secret",
    "password",
    "admin",
    "role",
    "permission",
  ];

  return tree
    .filter(
      (f: { type: string; path: string }) =>
        f.type === "blob" && f.path.match(/\.(ts|tsx|js|jsx|sql)$/)
    )
    .filter(
      (f: { path: string }) =>
        priorityPatterns[0].test(f.path) ||
        sensitiveKeywords.some((kw) => f.path.toLowerCase().includes(kw))
    )
    .slice(0, 30)
    .map((f: { path: string; url: string }) => ({ path: f.path, url: f.url }));
}

async function fetchFileContent(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "PontisSecurityCouncil",
    },
  });
  const data = await res.json();
  return Buffer.from(data.content || "", "base64")
    .toString("utf-8")
    .substring(0, 3000);
}

// Single lens analysis
async function runLens(
  codeContext: string,
  lens: "offensive" | "defensive" | "privacy" | "realism"
): Promise<string> {
  const prompts = {
    offensive: `You are a red team security expert. Your job is to find what attackers could exploit in this Pontis codebase.

Pontis context: A memorial tech company. Families upload grief data (photos, tributes, memories of deceased loved ones). Monument companies are customers. QR codes on headstones link to memorial profiles. Field workers install medallions at cemeteries.

SPECIFIC THREATS TO LOOK FOR:
- Supabase RLS bypass: Can a monument company access another company's family data?
- QR code hijacking: Can someone redirect a medallion QR to malicious content?
- API enumeration: Can an attacker enumerate memorial profiles or user data?
- Auth bypass: Missing auth checks on sensitive API routes
- IDOR: Can user A access user B's memorial profile without authorization?
- Rate limiting: Are there endpoints that can be abused at scale?
- Input validation: Injection vectors in user-submitted tribute content

Analyze this code and list SPECIFIC exploitable vulnerabilities. Be concrete — cite the file/pattern. If you find nothing exploitable, say so.

CODE:
${codeContext}`,

    defensive: `You are a defensive security architect reviewing the Pontis codebase.

Pontis context: Memorial tech company. Families trust this product with grief data about deceased loved ones. Monument companies are B2B customers with installer accounts.

EVALUATE:
- Auth flow completeness: Is every sensitive route protected?
- Supabase RLS: Are Row Level Security policies actually comprehensive?
- Input sanitization: Is user content (tributes, photo uploads) validated?
- Error handling: Do errors leak sensitive info (stack traces, internal paths)?
- Rate limiting: Protected against abuse?
- Dependency security: Any obviously outdated/vulnerable packages?
- Secrets management: Are credentials handled correctly?

List what protections exist and what's MISSING. Be specific about files.

CODE:
${codeContext}`,

    privacy: `You are a data privacy expert specializing in sensitive personal data. Review this Pontis codebase.

Pontis context: This product handles grief data — families sharing memories of deceased loved ones. This is among the most sensitive personal data that exists. Cemetery geolocation data. Family relationship data. Monument company customer data.

EVALUATE:
- What personal data is collected, stored, transmitted?
- Is grief/memorial data encrypted at rest and in transit?
- Are there logging statements that capture sensitive data?
- Are API responses leaking more data than necessary?
- Is cemetery/grave geolocation protected? (Can someone enumerate grave locations?)
- Are third-party services (Twilio, Stripe) receiving PII unnecessarily?
- Is there a clear data retention/deletion path?
- GDPR/CCPA considerations: right to deletion, data portability?
- Are family members who didn't consent having their data stored?

CODE:
${codeContext}`,

    realism: `You are a pragmatic security advisor who cuts through security theater. Review this Pontis codebase from a REALISTIC risk perspective.

Pontis context: Early-stage startup (~5 people). Memorial tech. QR medallions on headstones. B2B sales to monument companies.

YOUR JOB: Separate real risks from theoretical ones.

EVALUATE:
- What security issues are theoretical vs. actually exploitable at Pontis's current scale?
- What security work would have the HIGHEST real-world impact for a small team?
- What are they over-engineering that doesn't matter yet?
- What obvious things are being ignored in favor of complex solutions?
- What's the realistic threat model? (Disgruntled competitor? Grieving family data thief? Script kiddie? Nation-state? Be honest about who would actually attack this.)
- What one change would most reduce real security risk?

Be brutally honest. Don't pad with theoretical nonsense.

CODE:
${codeContext}`,
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompts[lens] }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// Opus synthesizer
async function synthesizeFindings(
  lensResults: Record<string, string>,
  filesList: string[]
): Promise<
  Array<{
    number: number;
    severity: "critical" | "high" | "medium" | "low" | "info";
    lens: string;
    title: string;
    description: string;
    affected_files: string[];
    remediation: string;
    effort: "quick-fix" | "needs-design" | "major-refactor";
  }>
> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `You are synthesizing security findings for the Pontis codebase from four expert analyses.

Files analyzed: ${filesList.join(", ")}

OFFENSIVE ANALYSIS:
${lensResults.offensive}

DEFENSIVE ANALYSIS:
${lensResults.defensive}

PRIVACY ANALYSIS:
${lensResults.privacy}

REALISM ANALYSIS:
${lensResults.realism}

Synthesize these into a NUMBERED LIST of distinct security findings. Remove duplicates, order by severity. For each finding output VALID JSON in this exact array format:

[
  {
    "number": 1,
    "severity": "critical|high|medium|low|info",
    "lens": "offensive|defensive|privacy|realism",
    "title": "Short title (max 80 chars)",
    "description": "Clear description of the issue (2-3 sentences)",
    "affected_files": ["file1.ts", "file2.ts"],
    "remediation": "Specific action to fix this (2-3 sentences)",
    "effort": "quick-fix|needs-design|major-refactor"
  }
]

Output ONLY the JSON array. No markdown, no preamble.`,
        },
      ],
    }),
  });
  const data = await res.json();
  const text = data.content?.[0]?.text || "[]";
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from text
    const match = text.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  }
}

export async function POST(req: NextRequest) {
  // Verify basic auth
  const authHeader = req.headers.get("authorization");
  if (authHeader) {
    const base64 = authHeader.split(" ")[1];
    const [user, pass] = Buffer.from(base64, "base64").toString().split(":");
    if (user !== "pontis" || pass !== "missioncontrol2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Create scan record
  const { data: scan, error: scanError } = await supabase
    .from("security_scans")
    .insert({ status: "running", repo: "pontis-life" })
    .select()
    .single();

  if (scanError)
    return NextResponse.json({ error: scanError.message }, { status: 500 });

  try {
    // Fetch files
    const files = await getRepoFiles();
    const fileContents = await Promise.all(
      files.slice(0, 20).map(async (f) => {
        const content = await fetchFileContent(f.url);
        return `// FILE: ${f.path}\n${content}`;
      })
    );
    const codeContext = fileContents
      .join("\n\n---\n\n")
      .substring(0, 40000);

    // Run 4 lenses in parallel
    const [offensive, defensive, privacy, realism] = await Promise.all([
      runLens(codeContext, "offensive"),
      runLens(codeContext, "defensive"),
      runLens(codeContext, "privacy"),
      runLens(codeContext, "realism"),
    ]);

    // Opus synthesis
    const findings = await synthesizeFindings(
      { offensive, defensive, privacy, realism },
      files.map((f) => f.path)
    );

    // Count severities
    const counts = findings.reduce(
      (acc, f) => {
        acc[f.severity] = (acc[f.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    // Store findings
    if (findings.length > 0) {
      await supabase.from("security_findings").insert(
        findings.map((f) => ({ ...f, scan_id: scan.id }))
      );
    }

    // Update scan record
    await supabase
      .from("security_scans")
      .update({
        status: "complete",
        files_analyzed: files.length,
        total_findings: findings.length,
        critical_count: counts.critical || 0,
        high_count: counts.high || 0,
        medium_count: counts.medium || 0,
        low_count: counts.low || 0,
        raw_output: { offensive, defensive, privacy, realism },
      })
      .eq("id", scan.id);

    // Telegram alert for critical/high
    const urgent = findings.filter(
      (f) => f.severity === "critical" || f.severity === "high"
    );
    if (urgent.length > 0) {
      const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
      const blakeChatId = "8559701342";
      const joeChatId = "8350931358";
      const msg = `🚨 *Security Council Alert*\n\n${urgent.length} critical/high finding${urgent.length > 1 ? "s" : ""} in nightly scan:\n\n${urgent
        .slice(0, 3)
        .map((f) => `*#${f.number} [${f.severity.toUpperCase()}]* ${f.title}`)
        .join(
          "\n"
        )}\n\nView all: https://pontis-mission-control.vercel.app/security`;

      if (telegramToken) {
        for (const chatId of [blakeChatId, joeChatId]) {
          await fetch(
            `https://api.telegram.org/bot${telegramToken}/sendMessage`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                text: msg,
                parse_mode: "Markdown",
              }),
            }
          ).catch(() => {});
        }
      }
    }

    return NextResponse.json({
      ok: true,
      scan_id: scan.id,
      findings_count: findings.length,
      counts,
    });
  } catch (e) {
    await supabase
      .from("security_scans")
      .update({ status: "failed", error: String(e) })
      .eq("id", scan.id);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
