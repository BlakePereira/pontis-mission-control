import { Suspense } from "react";
import WarRoom from "@/components/team/WarRoom";

export const dynamic = "force-dynamic";

export default function TeamPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Pontis Team</h1>
        <p className="text-[#555] text-sm mt-1">Founders + Clara&apos;s agent network</p>
      </div>
      <Suspense fallback={<div className="text-[#555]">Loading...</div>}>
        <WarRoom />
      </Suspense>
    </div>
  );
}
