import { Suspense } from "react";
import KnowledgeClient from "@/components/knowledge/KnowledgeClient";

export const dynamic = "force-dynamic";

export default function KnowledgePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Knowledge Base</h1>
        <p className="text-[#555] text-sm mt-1">Every article, video, and post — searchable forever.</p>
      </div>
      <Suspense fallback={<div className="text-[#555]">Loading...</div>}>
        <KnowledgeClient />
      </Suspense>
    </div>
  );
}
