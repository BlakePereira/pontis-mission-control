import SessionsClient from "@/components/sessions/SessionsClient";

export const dynamic = "force-dynamic";

export default function SessionsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Sessions</h1>
        <p className="text-[#555] text-sm mt-1">What Clara is working on</p>
      </div>
      <SessionsClient />
    </div>
  );
}
