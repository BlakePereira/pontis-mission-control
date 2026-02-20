import SalesFunnelClient from "@/components/sales-funnel/SalesFunnelClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sales Funnel — Mission Control",
  description: "Pipeline visualization for monument company prospects",
};

export default function SalesFunnelPage() {
  return <SalesFunnelClient />;
}
