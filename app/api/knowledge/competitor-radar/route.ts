import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Signals to watch for in the knowledge base
const COMPETITOR_SIGNALS = [
  // Monument/memorial industry competitors
  "granite links",
  "forever marker",
  "qr code memorial",
  "memorial qr",
  "smartstone",
  "everhere",
  "lasting tribute",
  "digital memorial",
  "memorial tech",
  // Broader market signals
  "cemetery technology",
  "funeral tech",
  "grief tech",
  "memorialization",
  "monument company",
  "headstone",
  "gravestone",
  "mausoleum",
  "columbarium",
  // Business signals
  "monument industry",
  "memorial industry",
  "death care",
  "bereavement technology",
];

interface RawItem {
  id: string;
  url: string;
  title: string;
  summary: string;
  content: string | null;
  added_at: string;
  tags: string[];
}

export async function GET() {
  const { data: items, error } = await supabase
    .from("knowledge_items")
    .select("id, url, title, summary, content, added_at, tags")
    .order("added_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!items) return NextResponse.json({ flagged: [], total_scanned: 0 });

  const flagged = (items as RawItem[])
    .filter((item) => {
      const text = `${item.title} ${item.summary} ${item.content || ""}`.toLowerCase();
      return COMPETITOR_SIGNALS.some((signal) => text.includes(signal));
    })
    .map((item) => {
      const text = `${item.title} ${item.summary} ${item.content || ""}`.toLowerCase();
      return {
        id: item.id,
        url: item.url,
        title: item.title,
        summary: item.summary,
        added_at: item.added_at,
        tags: item.tags,
        matched_signals: COMPETITOR_SIGNALS.filter((signal) => text.includes(signal)),
      };
    });

  return NextResponse.json({
    flagged,
    total_scanned: items.length,
    signals_count: COMPETITOR_SIGNALS.length,
  });
}
