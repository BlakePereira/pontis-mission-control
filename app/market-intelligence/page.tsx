import MarketIntelligenceClient from "@/components/market-intelligence/MarketIntelligenceClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Market Intelligence — Mission Control",
  description: "Monument industry search demand and market opportunity analysis",
};

export default function MarketIntelligencePage() {
  return <MarketIntelligenceClient />;
}
