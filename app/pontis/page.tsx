import { Suspense } from "react";
import PontisClient from "@/components/pontis/PontisClient";

export const dynamic = "force-dynamic";

export default function PontisPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Pontis Hub</h1>
        <p className="text-[#555] text-sm mt-1">Revenue metrics, customers, and growth tracking</p>
      </div>
      <Suspense fallback={<div className="text-[#555]">Loading Stripe data...</div>}>
        <PontisClient />
      </Suspense>
    </div>
  );
}
