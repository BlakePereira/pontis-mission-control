import { Suspense } from "react";
import EdgeClient from "@/components/edge/EdgeClient";

export const dynamic = "force-dynamic";

export default function EdgePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Clara&apos;s Edge</h1>
        <p className="text-[#555] text-sm mt-1">Sports betting model — bankroll &amp; performance tracker</p>
      </div>
      <Suspense fallback={<div className="text-[#555]">Loading...</div>}>
        <EdgeClient />
      </Suspense>
    </div>
  );
}
