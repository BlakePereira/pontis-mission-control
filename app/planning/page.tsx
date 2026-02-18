import PlanningClient from "@/components/planning/PlanningClient";

export const dynamic = "force-dynamic";

export default function PlanningPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Planning</h1>
        <p className="text-[#555] text-sm mt-1">
          Quarterly goals to weekly execution to daily accountability for Blake, Joe, and Clara.
        </p>
      </div>
      <PlanningClient />
    </div>
  );
}
