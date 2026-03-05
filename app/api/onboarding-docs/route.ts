import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = "onboarding-docs";

const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

// List all documents
export async function GET() {
  try {
    // List files from all category subfolders
    const categories = ["monument-company", "florist", "headstone-cleaning", "general"];
    const allFiles: Array<{ name: string; id?: string; created_at: string; metadata?: { size?: number; mimetype?: string } }> = [];

    for (const cat of categories) {
      const res = await fetch(
        `${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`,
        {
          method: "POST",
          headers: { ...sbHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({
            prefix: cat + "/",
            limit: 100,
            offset: 0,
            sortBy: { column: "created_at", order: "desc" },
          }),
        }
      );
      const catFiles = await res.json();
      if (Array.isArray(catFiles)) {
        // Prefix each file name with the category folder
        allFiles.push(...catFiles.map((f: { name: string; id?: string; created_at: string; metadata?: { size?: number; mimetype?: string } }) => ({
          ...f,
          name: `${cat}/${f.name}`,
        })));
      }
    }

    const files = allFiles;
    if (!files.length) {
      return NextResponse.json({ files: [] });
    }

    // Generate signed URLs for each file (valid 1 hour)
    // Filter out folder entries, placeholders, and zero-byte non-files
    const filesWithUrls = await Promise.all(
      files
        .filter((f: { name: string; id?: string; metadata?: { size?: number; mimetype?: string } }) => {
          if (!f.name || f.name.endsWith("/")) return false;
          if (f.name === ".emptyFolderPlaceholder") return false;
          // Folder entries have no id or no extension
          if (!f.id && !f.name.includes(".")) return false;
          return true;
        })
        .map(async (f: { name: string; created_at: string; metadata?: { size?: number; mimetype?: string } }) => {
          const signRes = await fetch(
            `${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${encodeURIComponent(f.name)}`,
            {
              method: "POST",
              headers: { ...sbHeaders, "Content-Type": "application/json" },
              body: JSON.stringify({ expiresIn: 3600 }),
            }
          );
          const signData = await signRes.json();
          return {
            name: f.name,
            created_at: f.created_at,
            size: f.metadata?.size || 0,
            type: f.metadata?.mimetype || "application/octet-stream",
            url: signData.signedURL
              ? `${SUPABASE_URL}/storage/v1${signData.signedURL}`
              : null,
          };
        })
    );

    return NextResponse.json({ files: filesWithUrls });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ files: [], error: error.message }, { status: 500 });
  }
}

// Upload a document
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "general";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Sanitize filename: category prefix + original name
    const safeName = `${category}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${safeName}`,
      {
        method: "POST",
        headers: {
          ...sbHeaders,
          "Content-Type": file.type || "application/octet-stream",
          "x-upsert": "true",
        },
        body: buffer,
      }
    );

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: JSON.stringify(data) }, { status: res.status });
    }

    return NextResponse.json({ success: true, path: safeName });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Delete a document
export async function DELETE(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "No file name provided" }, { status: 400 });
    }

    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(name)}`,
      {
        method: "DELETE",
        headers: sbHeaders,
      }
    );

    if (!res.ok) {
      const data = await res.json();
      return NextResponse.json({ error: JSON.stringify(data) }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
