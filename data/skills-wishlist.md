# Pontis + Clara Skills Wishlist

*Skills are reusable workflows triggered by name. Build these and I can execute complex multi-step tasks with a single command instead of re-explaining context every time.*

---

## 🏛️ Pontis Dev Skills

### `pontis-staging-check`
**Trigger:** "Run staging health check"
**What it does:**
1. Ping staging API endpoints (auth, profiles, QR scan)
2. Verify cron jobs are pointing to staging (not prod)
3. Check for any hardcoded prod URLs/keys in recent commits
4. Test OTP flow end-to-end
5. Report: pass/fail per check + anything that needs attention

**Value:** One command → full confidence staging is safe before any release

---

### `pontis-env-audit`
**Trigger:** "Run env audit"
**What it does:**
1. Grep codebase for hardcoded URLs, API keys, connection strings
2. Cross-reference against known safe patterns vs. risky ones
3. Generate hit list: file + line number + severity
4. Output summary for kanban task PONTIS-HC-001

**Value:** Closes the hardcoded values audit without Blake having to do it manually

---

### `pontis-pr-review`
**Trigger:** "Review this PR: [URL or branch]"
**What it does:**
1. Pull diff from GitHub
2. Check for: hardcoded values, missing env vars, staging vs prod logic errors
3. Review against Pontis code standards
4. Generate: summary of changes + risks + suggested improvements

**Value:** Second pair of eyes on every PR before merge to staging

---

### `pontis-feature-spec`
**Trigger:** "Write a spec for: [feature idea]"
**What it does:**
1. Expand the idea into full feature spec
2. Generate user stories (As a [role], I want [x] so that [y])
3. Write acceptance criteria
4. Identify edge cases and risks
5. Suggest kanban tasks to create

**Value:** Turn "here's an idea" into structured development tickets in minutes

---

## 📊 Pontis Ops Skills

### `monument-prospect`
**Trigger:** "Research monument company: [name, city, state]"
**What it does:**
1. Search for company info (website, contact, size, reviews)
2. Check if they have existing digital memorial tech
3. Research owner/decision maker name
4. Estimate revenue tier (small/mid/large)
5. Generate: 1-page prospect profile + personalized pitch angle

**Value:** Replaces the 149-company overnight research sessions — run on-demand per prospect

---

### `pontis-proposal`
**Trigger:** "Draft proposal for: [company name]"
**What it does:**
1. Pull prospect profile (or research on the fly)
2. Customize Pontis pitch to their specific pain points
3. Generate proposal doc with: problem → solution → pricing → call to action
4. Tailor tone based on company size (small family shop vs. regional chain)

**Value:** Proposals in minutes, not hours

---

### `pontis-compliance-brief`
**Trigger:** "Generate compliance brief"
**What it does:**
1. Pull current Pontis compliance status (PCI via Stripe, privacy policy status)
2. Generate 1-page security + compliance summary suitable for enterprise sales conversations
3. Highlight what we have, what we're working toward, what doesn't apply

**Value:** Sales-ready compliance doc Joe can send to any prospect asking about security

---

### `stripe-weekly`
**Trigger:** Automated every Monday 8am MT (cron)
**What it does:**
1. Pull Stripe data (revenue, new subs, churned subs, MRR)
2. Calculate week-over-week changes
3. Flag anything anomalous (spike, drop, failed payments)
4. Send weekly Stripe summary to Blake + Joe

**Value:** Revenue pulse without having to log into Stripe manually

---

## 🏀 Clara's Edge Skills

### `edge-daily-research`
**Trigger:** "Run today's edge research" OR automated at 8am MT on game nights
**What it does:**
1. Pull tonight's NBA/NFL slate from Ball Don't Lie + API-Football
2. Check injury reports for key players
3. Pull L10 stats for relevant props
4. Score each potential bet opportunity (1-10 edge score)
5. Identify cushion bets, line inflation, volume props
6. Output structured research file to `bank/betting/research/YYYY-MM-DD.md`

**Value:** Fixes the silent failure problem — research always completes or flags loudly

---

### `edge-picks-delivery`
**Trigger:** Automated at 2pm MT on game nights (after research file exists)
**What it does:**
1. Read today's research file
2. Filter to 7.5+ edge score picks
3. Build 2-3 parlay options at different risk levels
4. Calculate recommended bet sizes vs. current bankroll
5. Send formatted picks to Blake's Telegram group

**Value:** Completes the research → picks pipeline cleanly

---

### `edge-result-log`
**Trigger:** "Log results for [date]: [pick] [hit/miss] [$amount]"
**What it does:**
1. Update bankroll tracker
2. Update pick history with result
3. Update model accuracy stats per tier
4. Flag if win rate is trending down (model recalibration needed)

**Value:** Keeps bankroll + accuracy stats current without manual tracking

---

## 🙏 Blake Personal Skills

### `scripture-study`
**Trigger:** "Scripture study: [passage or next in series]"
**What it does:**
1. Load current position in Gospel walk-through
2. Present passage with historical context
3. Surface 2-3 reflection questions
4. Connect to Blake's current life/work themes
5. Log session to scripture tracker

**Value:** Structured spiritual formation vs. ad-hoc discussion

---

### `weekly-scorecard`
**Trigger:** Automated every Sunday 7pm MT (cron)
**What it does:**
1. Pull 5k streak status (confirm it happened each day)
2. Review week's Pontis progress vs. goals
3. Review dating goal (did Blake ask someone out?)
4. Check investment portfolio vs. $24-30k year-end goal
5. Send honest weekly performance review to Blake

**Value:** Blake said he wants systems for personal growth — this is the accountability layer

---

### `health-weekly`
**Trigger:** Automated every Monday morning (cron), after Apple Watch data syncs
**What it does:**
1. Pull last 7 days of health data from Clara-health iCloud folder
2. Calculate: avg sleep, RHR trend, HRV trend, workout frequency
3. Compare to baseline + targets
4. Flag any warning signs (sleep <5h, HRV dropping, rest days exceeded)
5. Send health summary with 1 priority recommendation

**Value:** Closes the Apple Watch data pipeline that was set up Feb 13 but never fully automated

---

## 🔮 Future / Big Bets

### `pontis-memorial-draft`
**Trigger:** "Draft memorial for: [name], [dates], [family note]"
- Generate a beautiful memorial profile write-up families can use as a starting point

### `pontis-onboarding-run`
**Trigger:** "Run onboarding for: [monument company name]"
- Walk through the full onboarding checklist, generate setup docs, send welcome materials

### `pontis-competitor-scan`
**Trigger:** "Competitor scan"
- Pull latest news/updates on Quiring Monuments, ForeverMissed, etc.
- Flag any new features, pricing changes, or marketing moves

---

## Priority Order

| Priority | Skill | Why |
|----------|-------|-----|
| 🔴 Now | `edge-daily-research` | Fixes the silent failure that cost us picks on Feb 16 |
| 🔴 Now | `pontis-env-audit` | Closes PONTIS-HC-001 open loop |
| 🟠 Soon | `stripe-weekly` | Automated revenue pulse (read-only key already configured) |
| 🟠 Soon | `monument-prospect` | Speeds up sales pipeline |
| 🟡 Later | `weekly-scorecard` | Personal accountability system for Blake |
| 🟡 Later | `health-weekly` | Closes the Apple Watch pipeline |
| 🟢 Future | `pontis-memorial-draft` | Product value-add |

---

*Created: 2026-02-16 by Clara, from Joe's request after watching Keith Rumjahn's OpenClaw tutorial*
