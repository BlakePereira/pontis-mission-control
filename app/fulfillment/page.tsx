import FulfillmentCRMClient from "@/components/fulfillment/FulfillmentCRMClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Fulfillment CRM — Mission Control",
  description: "Fulfillment partner network: florists, cleaners, coverage, and readiness tracking",
};

export default function FulfillmentCRMPage() {
  return <FulfillmentCRMClient />;
}
