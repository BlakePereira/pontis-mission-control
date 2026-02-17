import { Suspense } from "react";
import LoopsClient from "@/components/loops/LoopsClient";

export const dynamic = "force-dynamic";

export default function LoopsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Open Loops</h1>
        <p className="text-[#555] text-sm mt-1">Pontis pending items — tap to mark complete</p>
      </div>
      <Suspense fallback={<div className="text-[#555]">Loading loops...</div>}>
        <LoopsClient />
      </Suspense>
    </div>
  );
}
