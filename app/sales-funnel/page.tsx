import { headers } from "next/headers";
import SalesFunnelClient from "@/components/sales-funnel/SalesFunnelClient";

export const metadata = {
  title: "Sales Funnel — Mission Control",
  description: "Pipeline visualization for monument company prospects",
};

export default async function SalesFunnelPage() {
  // ── Basic Auth Check ──
  const headersList = await headers();
  const auth = headersList.get("authorization");

  if (!auth) {
    return new Response("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Mission Control"' },
    });
  }

  const [scheme, encoded] = auth.split(" ");
  if (scheme !== "Basic") {
    return new Response("Invalid auth scheme", { status: 401 });
  }

  const buffer = Buffer.from(encoded, "base64");
  const [username, password] = buffer.toString().split(":");

  if (username !== "pontis" || password !== "missioncontrol2026") {
    return new Response("Invalid credentials", { status: 401 });
  }

  return <SalesFunnelClient />;
}
