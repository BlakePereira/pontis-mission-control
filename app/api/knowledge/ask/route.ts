import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface KnowledgeItem {
  id: string;
  url: string;
  title: string;
  type: string;
  summary: string;
  author?: string;
  tags?: string[];
  added_by?: string;
  added_at?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "question required" }, { status: 400 });
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      `https://${req.headers.get("host") || "pontis-mission-control.vercel.app"}`;

    // Get relevant items via semantic/text search
    const searchRes = await fetch(
      `${appUrl}/api/knowledge/search?q=${encodeURIComponent(question)}&limit=5`,
      { headers: { "Content-Type": "application/json" } }
    );
    const searchData = await searchRes.json();
    const items: KnowledgeItem[] = searchData?.results || [];

    if (!items || items.length === 0) {
      return NextResponse.json({
        answer:
          "I don't have any relevant knowledge on that yet. Try ingesting some articles first!",
        sources: [],
      });
    }

    // Build context from top 3 results
    const context = items
      .slice(0, 3)
      .map(
        (item, i) =>
          `[${i + 1}] ${item.title}${item.author ? ` by ${item.author}` : ""}\n${item.summary || ""}\nSource: ${item.url}`
      )
      .join("\n\n");

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      // No Anthropic key — return raw results summary
      return NextResponse.json({
        answer: `Based on ${items.length} relevant items in the knowledge base. Top match: "${items[0].title}"`,
        sources: items.slice(0, 3),
      });
    }

    // Use Claude Haiku to synthesize an answer
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `You are Clara, an AI assistant for Pontis (a memorial technology company focused on cemetery monuments, headstones, and memorial products). Answer the following question based ONLY on the provided knowledge base context. Be concise and cite sources by number in brackets like [1].

Context:
${context}

Question: ${question}

Answer (2-4 sentences, cite sources with [1], [2], etc.):`,
          },
        ],
      }),
    });

    const aiData = await res.json();
    const answer = aiData.content?.[0]?.text || "Unable to generate answer.";

    return NextResponse.json({ answer, sources: items.slice(0, 3) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// Health check
export async function GET() {
  const { count } = await supabase
    .from("knowledge_items")
    .select("id", { count: "exact", head: true });
  return NextResponse.json({ ok: true, itemCount: count });
}
