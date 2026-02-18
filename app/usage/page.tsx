import UsageClient from "@/components/usage/UsageClient";

export const dynamic = "force-dynamic";

export default function UsagePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Model Usage</h1>
        <p className="text-[#555] text-sm mt-1">
          AI API usage tracker — tokens, costs, and spending trends
        </p>
      </div>
      <UsageClient />
    </div>
  );
}
