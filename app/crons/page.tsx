import CronsClient from "@/components/crons/CronsClient";

export const dynamic = "force-dynamic";

export default function CronsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Cron Jobs</h1>
        <p className="text-[#555] text-sm mt-1">Scheduled tasks running on the OpenClaw agent</p>
      </div>
      <CronsClient />
    </div>
  );
}
