import { Suspense } from "react";
import BibleClient from "@/components/bible/BibleClient";

export const dynamic = "force-dynamic";

export default function BiblePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Clara&apos;s Brain</h1>
        <p className="text-[#555] text-sm mt-1">Pontis Bible · Correction Log · Update Requests</p>
      </div>
      <Suspense fallback={<div className="text-[#555]">Loading Bible...</div>}>
        <BibleClient />
      </Suspense>
    </div>
  );
}
