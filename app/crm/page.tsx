import CRMClient from "@/components/crm/CRMClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "CRM — Mission Control",
  description: "Unified CRM workspace for pipeline, accounts, and tasks",
};

export default function CRMPage() {
  return <CRMClient />;
}
