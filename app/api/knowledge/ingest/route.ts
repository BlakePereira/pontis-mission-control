import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type KnowledgeType = "youtube" | "twitter" | "article" | "pdf" | "other";

function detectType(url: string): KnowledgeType {
  if (url.includes("youtube.com/watch") || url.includes("youtu.be/")) return "youtube";
  if (url.includes("twitter.com") || url.includes("x.com")) return "twitter";
  if (/\.pdf(?:$|[?#])/i.test(url)) return "pdf";
  return "article";
}

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim().replace(" - YouTube", "").replace(" | X", "") : "Untitled";
}

function extractContent(html: string): string {
  const cleaned = html
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "");

  const articleMatch = cleaned.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = cleaned.match(/<main[^>]*>([\s\S]*?)<\/main>/i);

  const content = articleMatch?.[1] || mainMatch?.[1] || cleaned;
  return stripHtml(content).substring(0, 50000);
}

function createSummary(content: string, maxLen = 500): string {
  if (!content) return "";
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 20);
  let summary = "";
  for (const sentence of sentences) {
    if (summary.length + sentence.length > maxLen) break;
    summary += `${sentence.trim()}. `;
  }
  return summary.trim() || content.substring(0, maxLen);
}

// Jina AI embeddings (768 dimensions)
async function getEmbedding(text: string): Promise<number[] | null> {
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
        input: [text.substring(0, 8000)],
      }),
    });
    const data = await res.json();
    return data.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

// Extract entities using regex heuristics (no npm packages needed)
function extractEntities(text: string, title: string): Record<string, string[]> {
  const combined = `${title} ${text}`.substring(0, 10000);

  // Companies: words followed by Inc, LLC, Corp, etc.
  const companies = [
    ...new Set([
      ...(combined.match(
        /\b([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*)\s+(?:Inc|LLC|Corp|Ltd|Co|Group|Labs|Technologies|Solutions|Platform|Systems)\b/g
      ) || []),
      ...(combined.match(/\b[A-Z]{2,5}\b/g) || []).filter((w) => w.length >= 3),
    ]),
  ].slice(0, 10);

  // People: "FirstName LastName" where both are capitalized
  const people = [
    ...new Set(combined.match(/\b([A-Z][a-z]+\s[A-Z][a-z]+)\b/g) || []),
  ]
    .filter((p) => !p.match(/^(The|This|That|These|Those|When|Where|What|How|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|June|July|August|September|October|November|December)/))
    .slice(0, 10);

  // Industry/tech concepts
  const concepts = [
    ...new Set(
      (combined.match(
        /\b(?:AI|ML|LLM|API|SaaS|B2B|ROI|KPI|MVP|CRM|ETL|RAG|vector|embedding|monument|cemetery|memorial|funeral|grief|headstone|medallion|QR code|subscription|revenue|churn|retention|conversion|pgvector|semantic search|knowledge base)\b/gi
      ) || [])
    ),
  ]
    .map((c) => c.toLowerCase())
    .slice(0, 15);

  return { companies, people, concepts };
}

export async function POST(req: NextRequest) {
  try {
    const { url, added_by = "unknown", tags = [] } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    const normalizedUrl = url.trim();

    const { data: existing, error: existingError } = await supabase
      .from("knowledge_items")
      .select("id, title")
      .eq("url", normalizedUrl)
      .maybeSingle();

    if (existingError && existingError.code !== "PGRST116") {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true, item: existing });
    }

    const type = detectType(normalizedUrl);
    let title = "Untitled";
    let content = "";
    let author = "";

    if (type === "youtube") {
      const videoId = getYouTubeId(normalizedUrl);
      if (!videoId) {
        return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
      }

      try {
        const mod = (await import("youtube-transcript")) as {
          YoutubeTranscript?: { fetchTranscript: (id: string) => Promise<Array<{ text: string }>>;
          };
        };
        if (mod.YoutubeTranscript) {
          const transcriptItems = await mod.YoutubeTranscript.fetchTranscript(videoId);
          content = transcriptItems.map((t) => t.text).join(" ");
        }
      } catch {
        content = "";
      }

      try {
        const res = await fetch(normalizedUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
        const html = await res.text();
        title = extractTitle(html);
        const authorMatch = html.match(/"author":"([^"]+)"/);
        author = authorMatch?.[1] || "";
        if (!content) content = extractContent(html);
      } catch {
        // no-op
      }
    } else if (type === "twitter") {
      // Use FxTwitter API for better tweet data + thread following
      const tweetIdMatch = normalizedUrl.match(/status\/(\d+)/);
      if (tweetIdMatch) {
        const tweetId = tweetIdMatch[1];
        try {
          const res = await fetch(`https://api.fxtwitter.com/status/${tweetId}`, {
            headers: { "User-Agent": "Mozilla/5.0" },
            signal: AbortSignal.timeout(10000),
          });
          const data = await res.json();
          const tweet = data.tweet;
          if (tweet) {
            title = `@${tweet.author?.screen_name}: ${(tweet.text || "").substring(0, 80)}${(tweet.text || "").length > 80 ? "..." : ""}`;
            author = tweet.author?.name || tweet.author?.screen_name || "";
            content = tweet.text || "";

            // Follow thread chain (up to 5 levels deep)
            let threadId = tweet.replying_to_status;
            let threadCount = 0;
            while (threadId && threadCount < 5) {
              try {
                const threadRes = await fetch(`https://api.fxtwitter.com/status/${threadId}`, {
                  signal: AbortSignal.timeout(5000),
                });
                const threadData = await threadRes.json();
                if (threadData.tweet) {
                  content = `${threadData.tweet.text}\n\n---\n\n${content}`;
                  threadId = threadData.tweet.replying_to_status;
                } else {
                  break;
                }
              } catch {
                break;
              }
              threadCount++;
            }

            // Background-ingest any linked URLs in the tweet (non-Twitter links)
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pontis-mission-control.vercel.app";
            const linkedUrls = (tweet.text || "").match(/https?:\/\/\S+/g) || [];
            for (const linkedUrl of linkedUrls.slice(0, 2)) {
              if (
                !linkedUrl.includes("twitter.com") &&
                !linkedUrl.includes("x.com") &&
                !linkedUrl.includes("t.co")
              ) {
                fetch(`${appUrl}/api/knowledge/ingest`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ url: linkedUrl, added_by, tags: [...(Array.isArray(tags) ? tags : []), "from-tweet"] }),
                }).catch(() => {});
              }
            }
          } else {
            throw new Error("No tweet data");
          }
        } catch {
          // Fallback to HTML scraping
          try {
            const res = await fetch(normalizedUrl, {
              headers: { "User-Agent": "Mozilla/5.0 (compatible; Twitterbot/1.0)" },
              signal: AbortSignal.timeout(10000),
            });
            const html = await res.text();
            title = extractTitle(html);
            content = extractContent(html);
            const descMatch =
              html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i) ||
              html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i);
            if (descMatch) content = `${descMatch[1]}\n\n${content}`;
          } catch {
            content = `X/Twitter post: ${normalizedUrl}`;
            title = "Twitter Post";
          }
        }
      } else {
        content = `X/Twitter post: ${normalizedUrl}`;
        title = "Twitter Post";
      }
    } else {
      try {
        const res = await fetch(normalizedUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          },
          signal: AbortSignal.timeout(10000),
        });
        const html = await res.text();
        title = extractTitle(html);
        content = extractContent(html);

        const authorMatch = html.match(/<meta[^>]+name="author"[^>]+content="([^"]+)"/i);
        author = authorMatch?.[1] || "";
      } catch (e) {
        return NextResponse.json({ error: `Failed to fetch URL: ${String(e)}` }, { status: 400 });
      }
    }

    const summary = createSummary(content);

    // Generate embedding and extract entities in parallel
    const textToEmbed = `${title} ${summary} ${content.substring(0, 5000)}`;
    const [embedding, entities] = await Promise.all([
      getEmbedding(textToEmbed),
      Promise.resolve(extractEntities(content, title)),
    ]);

    const { data, error } = await supabase
      .from("knowledge_items")
      .insert({
        url: normalizedUrl,
        title,
        type,
        summary,
        content,
        author,
        tags: Array.isArray(tags) ? tags : [],
        added_by,
        embedding,
        entities,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, item: data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
