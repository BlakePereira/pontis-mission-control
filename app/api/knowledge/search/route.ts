import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getQueryEmbedding(query: string): Promise<number[] | null> {
  const jinaKey = process.env.JINA_API_KEY;
  if (!jinaKey) return null;
  try {
    const res = await fetch("https://api.jina.ai/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jinaKey}`,
      },
      body: JSON.stringify({
        model: "jina-embeddings-v2-base-en",
        input: [query],
      }),
    });
    const data = await res.json();
    return data.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const type = searchParams.get("type") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

  if (!q.trim()) {
    let query = supabase
      .from("knowledge_items")
      .select("id, url, title, type, summary, author, tags, entities, added_by, added_at")
      .order("added_at", { ascending: false })
      .limit(limit);

    if (type) query = query.eq("type", type);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ results: data || [], query: "", mode: "list" });
  }

  // Try semantic search first (if Jina key is configured)
  const queryEmbedding = await getQueryEmbedding(q);

  if (queryEmbedding) {
    try {
      const { data: semanticResults, error: rpcError } = await supabase.rpc(
        "match_knowledge_items",
        {
          query_embedding: queryEmbedding,
          match_threshold: 0.5,
          match_count: limit,
        }
      );

      if (!rpcError && semanticResults && semanticResults.length > 0) {
        return NextResponse.json({
          results: semanticResults,
          query: q,
          mode: "semantic",
        });
      }
    } catch {
      // Fall through to text search
    }
  }

  // Fallback: full-text / ilike search
  let query = supabase
    .from("knowledge_items")
    .select("id, url, title, type, summary, author, tags, entities, added_by, added_at")
    .or(`title.ilike.%${q}%,summary.ilike.%${q}%,content.ilike.%${q}%,author.ilike.%${q}%`)
    .order("added_at", { ascending: false })
    .limit(limit);

  if (type) query = query.eq("type", type);

  const { data: textResults, error: textError } = await query;
  if (textError) return NextResponse.json({ error: textError.message }, { status: 500 });

  return NextResponse.json({
    results: textResults || [],
    query: q,
    mode: "text",
  });
}
