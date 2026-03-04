import OnboardingClient from "@/components/onboarding/OnboardingClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Onboarding Hub — Mission Control",
  description: "Sales scripts, demo guides, and onboarding checklists for monument companies and fulfillment partners",
};

export default function OnboardingPage() {
  return <OnboardingClient />;
}
