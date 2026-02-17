import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BriefItem {
  id: string;
  url: string;
  title: string;
  type: string;
  summary: string;
  author: string;
  added_by: string;
  added_at: string;
}

export async function GET() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: recent, error } = await supabase
    .from("knowledge_items")
    .select("id, url, title, type, summary, author, added_by, added_at")
    .gte("added_at", since)
    .order("added_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!recent || recent.length === 0) {
    return NextResponse.json({
      brief: "No new knowledge items added in the last 24 hours.",
      count: 0,
      items: [],
    });
  }

  // Group by type
  const byType = (recent as BriefItem[]).reduce(
    (acc: Record<string, BriefItem[]>, item) => {
      if (!acc[item.type]) acc[item.type] = [];
      acc[item.type].push(item);
      return acc;
    },
    {}
  );

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let brief = `📚 Knowledge Brief — ${dateStr}\n`;
  brief += `${recent.length} new item${recent.length > 1 ? "s" : ""} added in the last 24 hours\n\n`;

  for (const [type, typeItems] of Object.entries(byType)) {
    brief += `**${type.toUpperCase()}** (${typeItems.length})\n`;
    for (const item of typeItems.slice(0, 3)) {
      brief += `• ${item.title}\n`;
      if (item.summary) {
        brief += `  ${item.summary.substring(0, 120)}...\n`;
      }
      brief += `  ${item.url}\n`;
    }
    if (typeItems.length > 3) {
      brief += `  ...and ${typeItems.length - 3} more\n`;
    }
    brief += "\n";
  }

  return NextResponse.json({
    brief,
    count: recent.length,
    items: recent,
    by_type: Object.fromEntries(
      Object.entries(byType).map(([k, v]) => [k, v.length])
    ),
  });
}
