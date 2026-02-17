import { Suspense } from "react";
import DashboardClient from "@/components/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Command Center</h1>
        <p className="text-[#555] text-sm mt-1">Pontis Mission Control — Real-time overview</p>
      </div>
      <Suspense fallback={<LoadingSkeleton />}>
        <DashboardClient />
      </Suspense>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-[#161616] border border-[#2a2a2a] rounded-xl h-36 animate-pulse" />
      ))}
    </div>
  );
}
