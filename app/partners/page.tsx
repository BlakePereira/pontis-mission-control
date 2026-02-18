import PartnersClient from "@/components/partners/PartnersClient";

export const dynamic = "force-dynamic";

export default function PartnersPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Partners</h1>
        <p className="text-[#555] text-sm mt-1">Monument company CRM — pipeline, contacts, activity</p>
      </div>
      <PartnersClient />
    </div>
  );
}
