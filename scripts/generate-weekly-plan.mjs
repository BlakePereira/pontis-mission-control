#!/usr/bin/env node

/**
 * generate-weekly-plan.mjs
 * 
 * Auto-generates next week's plan (theme + outcomes) based on:
 * - Quarterly goals
 * - Current progress
 * - Recent task completion
 * - What's behind / at risk
 * 
 * Called by cron every Sunday 9 PM MT.
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENROUTER_API_KEY) {
  console.error("❌ Missing required env vars: SUPABASE_URL, SUPABASE_KEY, OPENROUTER_API_KEY");
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

function getNextMonday() {
  const now = new Date();
  const day = now.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysUntilMonday);
  const local = new Date(monday.getTime() - monday.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

async function fetchPlanningContext(quarter) {
  const [goalsRes, weeksRes, dailyRes] = await Promise.all([
    fetch(
      `${SUPABASE_URL}/rest/v1/planning_goals?quarter=eq.${encodeURIComponent(quarter)}&order=created_at.desc`,
      { headers: sbHeaders }
    ),
    fetch(
      `${SUPABASE_URL}/rest/v1/planning_weeks?quarter=eq.${encodeURIComponent(quarter)}&order=week_start.desc&limit=4`,
      { headers: sbHeaders }
    ),
    fetch(
      `${SUPABASE_URL}/rest/v1/planning_daily?order=date.desc&limit=100`,
      { headers: sbHeaders }
    ),
  ]);

  const [goals, weeks, daily] = await Promise.all([
    goalsRes.ok ? goalsRes.json() : [],
    weeksRes.ok ? weeksRes.json() : [],
    dailyRes.ok ? dailyRes.json() : [],
  ]);

  return { goals, weeks, daily };
}

function buildPrompt(ctx, quarter, nextWeekStart) {
  const goalsText = ctx.goals
    .map(
      (g) =>
        `- ${g.title} | ${g.current_value}/${g.target_value} ${g.unit || ""} | Status: ${g.status} | Owner: ${g.owner || "all"}`
    )
    .join("\n") || "No goals set yet.";

  const weeksText = ctx.weeks
    .map((w) => {
      const outcomes = Array.isArray(w.planned_outcomes) ? w.planned_outcomes : [];
      const outcomesStr = outcomes.map((o) => `  • ${o.title} (${o.status || "pending"})`).join("\n");
      return `Week of ${w.week_start}:\n  Theme: ${w.theme || "none"}\n${outcomesStr || "  No outcomes"}`;
    })
    .join("\n") || "No weekly plans yet.";

  const completedLastWeek = ctx.daily.filter(
    (t) => t.status === "done" && t.date >= ctx.weeks[0]?.week_start
  ).length;
  const totalLastWeek = ctx.daily.filter((t) => t.date >= ctx.weeks[0]?.week_start).length;

  return `You are Clara, AI cofounder at Pontis. Generate next week's plan.

Current Quarter: ${quarter}
Next Week Starts: ${nextWeekStart}

QUARTERLY GOALS:
${goalsText}

RECENT WEEKLY PLANS:
${weeksText}

LAST WEEK STATS:
- Tasks completed: ${completedLastWeek}/${totalLastWeek}

Generate a weekly plan for next week with:
1. A **theme** (1 short sentence: what should this week accomplish?)
2. 3-5 **planned outcomes** (concrete deliverables, each linked to a quarterly goal if relevant)

Prioritize:
- Goals that are "at_risk" or "behind"
- Things that are blockers to other work
- Revenue/sales momentum (always keep this moving)
- Balance across Blake, Joe, and Clara

Respond with valid JSON only:
{
  "theme": "Short theme sentence",
  "planned_outcomes": [
    {
      "title": "Concrete deliverable",
      "owner": "blake|joe|clara|all",
      "goal_id": "goal_id or null"
    }
  ]
}`;
}

async function generatePlan(quarter, nextWeekStart) {
  console.log(`\n📅 Generating weekly plan for: ${nextWeekStart} (${quarter})`);

  const ctx = await fetchPlanningContext(quarter);
  const prompt = buildPrompt(ctx, quarter, nextWeekStart);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://pontis-mission-control.vercel.app",
      "X-Title": "Pontis Mission Control",
    },
    body: JSON.stringify({
      model: "anthropic/claude-sonnet-4-5",
      messages: [
        {
          role: "system",
          content: "You are Clara, AI cofounder at Pontis. Generate weekly plans that are concrete, actionable, and tied to quarterly goals. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = await response.json();
  const rawText = data.choices[0]?.message?.content || "";

  let plan;
  try {
    plan = JSON.parse(rawText);
  } catch (err) {
    console.error("❌ Failed to parse Claude response as JSON:", rawText);
    throw new Error("Invalid JSON response from Claude");
  }

  if (!plan.theme || !Array.isArray(plan.planned_outcomes)) {
    console.error("❌ Invalid plan structure:", plan);
    throw new Error("Plan missing theme or planned_outcomes");
  }

  return plan;
}

async function savePlan(quarter, nextWeekStart, plan) {
  const payload = {
    week_start: nextWeekStart,
    quarter,
    theme: plan.theme,
    planned_outcomes: plan.planned_outcomes,
    retrospective: null,
    score: null,
    blake_score: null,
    joe_score: null,
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/planning_weeks`, {
    method: "POST",
    headers: sbHeaders,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to save weekly plan: ${error}`);
  }

  const saved = await res.json();
  return saved;
}

async function main() {
  try {
    const quarter = getCurrentQuarter();
    const nextWeekStart = getNextMonday();

    // Check if plan already exists
    const existing = await fetch(
      `${SUPABASE_URL}/rest/v1/planning_weeks?week_start=eq.${nextWeekStart}`,
      { headers: sbHeaders }
    );
    const existingPlans = await existing.json();

    if (existingPlans.length > 0) {
      console.log(`✅ Plan for ${nextWeekStart} already exists. Skipping.`);
      return;
    }

    const plan = await generatePlan(quarter, nextWeekStart);
    const saved = await savePlan(quarter, nextWeekStart, plan);

    console.log(`\n✅ Weekly plan created for ${nextWeekStart}:`);
    console.log(`   Theme: "${plan.theme}"`);
    console.log(`   Outcomes: ${plan.planned_outcomes.length}`);
    plan.planned_outcomes.forEach((o, i) => {
      console.log(`   ${i + 1}. [${o.owner}] ${o.title}`);
    });
  } catch (err) {
    console.error("\n❌ Error generating weekly plan:", err.message);
    process.exit(1);
  }
}

main();
