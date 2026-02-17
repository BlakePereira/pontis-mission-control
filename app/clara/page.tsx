import { Suspense } from "react";
import ClaraClient from "@/components/clara/ClaraClient";

export const dynamic = "force-dynamic";

export default function ClaraPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Clara Console</h1>
        <p className="text-[#555] text-sm mt-1">Cron jobs, skills wishlist, and system status</p>
      </div>
      <Suspense fallback={<div className="text-[#555]">Loading Clara data...</div>}>
        <ClaraClient />
      </Suspense>
    </div>
  );
}
