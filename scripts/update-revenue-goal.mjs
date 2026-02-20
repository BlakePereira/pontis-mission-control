#!/usr/bin/env node

/**
 * update-revenue-goal.mjs
 * 
 * Auto-updates the revenue goal in planning_goals table with real Stripe data.
 * Runs daily (or as needed via cron).
 * 
 * Pulls from Stripe:
 * - Total charges (successful)
 * - Total invoices paid
 * - Balance transactions (net revenue)
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_KEY = process.env.STRIPE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !STRIPE_KEY) {
  console.error("❌ Missing required env vars: SUPABASE_URL, SUPABASE_KEY, STRIPE_KEY");
  process.exit(1);
}

const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

function getCurrentQuarter() {
  const now = new Date();
  const month = now.getMonth();
  const quarter = Math.floor(month / 3) + 1;
  return `${now.getFullYear()}-Q${quarter}`;
}

function getQuarterStartTimestamp(quarter) {
  const [year, q] = quarter.split("-Q");
  const startMonth = (parseInt(q) - 1) * 3;
  return Math.floor(new Date(Date.UTC(parseInt(year), startMonth, 1)).getTime() / 1000);
}

async function getStripeRevenue(quarterStart) {
  // Use Stripe API to get charges from the quarter start
  const url = `https://api.stripe.com/v1/charges?limit=100&created[gte]=${quarterStart}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${STRIPE_KEY}`,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Stripe API error: ${error}`);
  }

  const data = await res.json();

  // Sum successful charges
  const totalCents = data.data
    .filter((charge) => charge.status === "succeeded")
    .reduce((sum, charge) => sum + charge.amount, 0);

  return totalCents / 100; // Convert cents to dollars
}

async function findRevenueGoal(quarter) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/planning_goals?quarter=eq.${encodeURIComponent(quarter)}&target_metric=ilike.*revenue*`,
    { headers: sbHeaders }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch revenue goal");
  }

  const goals = await res.json();

  // Look for a goal with "revenue" in the title or target_metric
  const revenueGoal = goals.find(
    (g) =>
      g.title.toLowerCase().includes("revenue") ||
      (g.target_metric && g.target_metric.toLowerCase().includes("revenue"))
  );

  if (!revenueGoal) {
    console.warn(`⚠️  No revenue goal found for ${quarter}`);
    return null;
  }

  return revenueGoal;
}

async function updateGoal(goalId, currentValue) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/planning_goals?id=eq.${goalId}`, {
    method: "PATCH",
    headers: sbHeaders,
    body: JSON.stringify({ current_value: currentValue }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to update goal: ${error}`);
  }
}

async function main() {
  try {
    const quarter = getCurrentQuarter();
    const quarterStart = getQuarterStartTimestamp(quarter);

    console.log(`\n💰 Updating revenue goal for ${quarter}...`);

    const revenueGoal = await findRevenueGoal(quarter);

    if (!revenueGoal) {
      console.log("❌ No revenue goal found. Exiting.");
      return;
    }

    const currentRevenue = await getStripeRevenue(quarterStart);

    console.log(`   Goal: ${revenueGoal.title}`);
    console.log(`   Old value: $${revenueGoal.current_value}`);
    console.log(`   New value: $${currentRevenue.toFixed(2)}`);

    await updateGoal(revenueGoal.id, currentRevenue);

    console.log(`\n✅ Revenue goal updated successfully!`);
  } catch (err) {
    console.error("\n❌ Error updating revenue goal:", err.message);
    process.exit(1);
  }
}

main();
