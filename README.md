# Mission Control 🌸

A locally-hosted Next.js command center for Blake Pereira and Joe Duerden at Pontis.

## Quick Start

```bash
cd /Users/claraadkinson/.openclaw/workspace/mission-control
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Pages

| Route | Description |
|-------|-------------|
| `/` | Command Center — key metrics dashboard |
| `/pontis` | Pontis Hub — Stripe revenue, customers, MRR chart |
| `/kanban` | Kanban Board — Supabase task management |
| `/edge` | Clara's Edge — betting model & bankroll tracker |
| `/loops` | Open Loops — interactive checklist from `bank/open-loops.md` |
| `/goals` | Goal Tracker — Blake's 2026 goals with progress bars |
| `/clara` | Clara Console — cron jobs, skills wishlist, system status |

## Data Sources

- **Supabase**: Live kanban data (boards + tasks)
- **Stripe**: Live revenue, subscriptions, customers
- **Local files**: `bank/open-loops.md`, `betting-tracker.csv`, `bank/skills-wishlist.md`

API keys are stored in `.env.local` (never committed).

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts (charts)
- Supabase JS client
- Stripe Node SDK

## Notes

- No auth — localhost only
- All API keys are server-side only (Next.js API routes)
- Editable goals/streaks stored in browser localStorage
- Loop checkboxes stored in browser localStorage

Built by Clara 🌸 on Feb 16, 2026
