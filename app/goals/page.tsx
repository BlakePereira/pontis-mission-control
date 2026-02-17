import { Suspense } from "react";
import GoalsClient from "@/components/goals/GoalsClient";

export const dynamic = "force-dynamic";

export default function GoalsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Goal Tracker</h1>
        <p className="text-[#555] text-sm mt-1">Blake&apos;s 2026 goals — progress and accountability</p>
      </div>
      <Suspense fallback={<div className="text-[#555]">Loading...</div>}>
        <GoalsClient />
      </Suspense>
    </div>
  );
}
