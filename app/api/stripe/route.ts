import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function GET() {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-01-28.clover",
    });

    // Get customers
    const customers = await stripe.customers.list({ limit: 100 });

    // Get subscriptions
    const subscriptions = await stripe.subscriptions.list({ limit: 100, status: "active" });

    // Get charges for last 6 months
    const sixMonthsAgo = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 180;
    const charges = await stripe.charges.list({
      limit: 100,
      created: { gte: sixMonthsAgo },
    });

    // Calculate MRR from active subscriptions
    let mrr = 0;
    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        const price = item.price;
        const amount = (price.unit_amount || 0) / 100;
        if (price.recurring?.interval === "year") {
          mrr += amount / 12;
        } else if (price.recurring?.interval === "month") {
          mrr += amount * (item.quantity || 1);
        }
      }
    }

    // Group charges by month
    const monthlyRevenue: Record<string, number> = {};
    for (const charge of charges.data) {
      if (charge.status !== "succeeded") continue;
      const d = new Date(charge.created * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyRevenue[key] = (monthlyRevenue[key] || 0) + charge.amount / 100;
    }

    // Build 6-month array
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      months.push({ key, label, revenue: monthlyRevenue[key] || 0 });
    }

    // Total revenue
    const totalRevenue = charges.data
      .filter((c) => c.status === "succeeded")
      .reduce((sum, c) => sum + c.amount / 100, 0);

    // Customer list enriched
    const customerList = customers.data.map((c) => {
      const sub = subscriptions.data.find((s) => s.customer === c.id);
      return {
        id: c.id,
        name: c.name || "—",
        email: c.email || "—",
        created: c.created,
        subscriptionStatus: sub?.status || "none",
      };
    });

    return NextResponse.json({
      mrr: Math.round(mrr * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      activeSubscriptions: subscriptions.data.length,
      customerCount: customers.data.length,
      monthlyRevenue: months,
      customers: customerList,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Stripe error:", error.message);
    return NextResponse.json(
      {
        error: error.message,
        mrr: 0,
        totalRevenue: 0,
        activeSubscriptions: 0,
        customerCount: 0,
        monthlyRevenue: [],
        customers: [],
      },
      { status: 200 }
    );
  }
}
