# Planning Page Redesign Spec

## Overview
Redesign the Mission Control Planning page (`/planning`) to be Clara-driven and dynamic. The current page is a passive display — the new version should be a daily tool that helps Blake, Joe, and Clara execute on quarterly goals.

## Current State
- `app/planning/page.tsx` — wrapper, imports PlanningClient
- `components/planning/PlanningClient.tsx` — ~500 line React component with 3 tabs (Dashboard, Weekly, Quarterly)
- API routes exist: `/api/planning/goals`, `/api/planning/goals/[id]`, `/api/planning/weeks`, `/api/planning/weeks/[id]`, `/api/planning/daily`, `/api/planning/daily/[id]`
- Supabase tables: `planning_goals`, `planning_weeks`, `planning_daily`
- Goals ARE populated (9 goals for quarter 2026-Q1). Weekly plans and daily tasks are empty.
- Auth: Basic auth via middleware (username: pontis, password: missioncontrol2026)

## Design Language
- Dark theme: bg `#0a0a0a`, cards `#111`, borders `#2a2a2a`, text white/`#999`/`#555`
- Accent: emerald-500 for positive, amber-500 for warning, red-500 for danger
- Rounded corners (`rounded-xl`), subtle borders, clean spacing
- Font: system default (already configured)
- Icons: lucide-react (already installed)
- Use existing Tailwind classes — no new CSS files

## New Layout Structure

### Dashboard Tab (Default) — Split View
```
┌────────────────────────────────────────────────────────────────┐
│  PLANNING                                     [Q: 2026-Q1 ▾]  │
│  [Dashboard] [Weekly] [Quarterly]                              │
├─────────────────────────────────┬──────────────────────────────┤
│                                 │                              │
│  📅 TODAY'S FOCUS               │  💬 CLARA                    │
│  Date: Feb 20, 2026             │                              │
│                                 │  Planning-aware chat panel   │
│  BLAKE                          │                              │
│  ☐ Task 1                       │  Messages scroll here        │
│  ☐ Task 2                       │                              │
│  ☐ Task 3                       │                              │
│                                 │                              │
│  JOE                            │                              │
│  ☐ Task 1                       │                              │
│  ☐ Task 2                       │                              │
│                                 │                              │
│  CLARA                          │                              │
│  ☑ Task 1 (done)                │                              │
│  ☐ Task 2                       │                              │
│                                 │                              │
│  ───────────────────────        │                              │
│                                 │                              │
│  📊 THIS WEEK                   │  ┌──────────────────────┐    │
│  Theme: "Ship CI/CD..."         │  │ Type a message...    │    │
│  Progress: ████░░░ 60%          │  └──────────────────────┘    │
│  Key outcomes listed             │                              │
│                                 │                              │
│  ───────────────────────        │                              │
│                                 │                              │
│  🎯 QUARTERLY GOALS (compact)  │                              │
│  Revenue     ██░░░░ $0/$6k     │                              │
│  Companies   ░░░░░░ 0/10      │                              │
│  CI/CD       ░░░░░░ at risk   │                              │
│  ...more goals...               │                              │
│                                 │                              │
│  ───────────────────────        │                              │
│  Drift Score: 85%               │                              │
│                                 │                              │
└─────────────────────────────────┴──────────────────────────────┘
```

Left side: ~60% width. Right side (chat): ~40% width.
On mobile: chat panel collapses to a floating button that opens a modal/drawer.

### Weekly Tab
Keep existing weekly grid but make it functional:
- Current week highlighted and expanded by default
- Show planned outcomes with status toggles
- Show daily tasks nested under each week
- Add a "Generate Plan" button that calls the chat API to create a week plan

### Quarterly Tab
Keep existing quarterly goals view — it works. Just add:
- Category grouping (Business / Product / Personal)
- Quick-update buttons for current_value (increment/set without opening full edit mode)

## New API Route: `/api/planning/chat`

### POST `/api/planning/chat`
Accepts a chat message and returns Clara's response with planning context.

**Request:**
```json
{
  "message": "What should I focus on today?",
  "history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "quarter": "2026-Q1"
}
```

**Response:**
```json
{
  "reply": "Based on your quarterly goals, here's what I'd prioritize today...",
  "actions": [
    {"type": "create_daily_task", "data": {"owner": "blake", "task": "Fix CI/CD pipeline", "goal_id": "xxx"}},
    {"type": "create_daily_task", "data": {"owner": "joe", "task": "Call Anderson Monuments", "goal_id": "yyy"}}
  ]
}
```

**Implementation:**
1. Fetch current goals, this week's plan, and today's tasks from Supabase
2. Build a system prompt with all planning context
3. Call Anthropic Claude API (model: claude-sonnet-4-5-20250514)
4. Parse response for any suggested actions
5. Return reply + actions

**API Key:** Use environment variable `ANTHROPIC_API_KEY`. It should already be set in Vercel env vars (check — if not, we'll add it).

**System prompt template:**
```
You are Clara, AI cofounder at Pontis. You're helping Blake and Joe plan and execute on their quarterly goals.

Current Quarter: {quarter}

QUARTERLY GOALS:
{goals formatted as list with progress}

THIS WEEK'S PLAN:
{week theme + planned outcomes + status}

TODAY'S TASKS:
{today's tasks by owner with status}

RECENT DAILY TASK HISTORY (last 7 days):
{completed/deferred tasks}

Help them prioritize, break down goals into actionable tasks, identify blockers, and stay focused. Be direct and specific. When suggesting tasks, include which quarterly goal they map to.

If the user asks you to create tasks or update plans, include them in the "actions" array of your response. Supported actions:
- create_daily_task: {owner, task, goal_id, date, priority}
- create_weekly_outcome: {title, owner, goal_id}
- update_goal_status: {goal_id, status}
- update_goal_progress: {goal_id, current_value}
```

**Response format instruction (add to system prompt):**
```
Respond in JSON format:
{
  "reply": "Your conversational response in markdown",
  "actions": [] // array of action objects, empty if no actions needed
}
```

### Executing Actions
When the chat returns actions, the frontend should:
1. Show the actions as pending suggestions below the message
2. User clicks "Apply" or "Apply All" to execute them
3. Frontend calls the appropriate existing API routes (POST /api/planning/daily, PATCH /api/planning/goals/[id], etc.)
4. Refresh the left panel data after applying

## New Component: ChatPanel

`components/planning/ChatPanel.tsx`

**State:**
- `messages`: array of {role: 'user'|'assistant', content: string, actions?: Action[]}
- `input`: string
- `loading`: boolean
- `appliedActions`: Set<string> to track which suggested actions have been applied

**UI:**
- Header: "💬 Clara" with a subtle border-bottom
- Message list: scrollable, auto-scroll to bottom
- User messages: right-aligned, emerald-tinted bubble
- Clara messages: left-aligned, dark bubble, markdown rendered
- Action suggestions: below Clara's message, each with an "Apply" button
- Input: text input at bottom with send button, enter to submit
- Loading: typing indicator dots

**Props:**
- `quarter: string`
- `onDataChange: () => void` — callback to refresh the left panel when actions are applied

## Component: TodayFocus

`components/planning/TodayFocus.tsx`

Shows today's tasks grouped by owner (blake, joe, clara). Each task has:
- Checkbox to toggle done/pending
- Task text (strikethrough when done)
- Small badge showing linked goal name (if goal_id exists)
- Priority indicator (subtle, like a colored left border)

If no tasks exist for today, show: "No tasks for today yet. Ask Clara to generate today's plan →" with a link/button that pre-fills the chat with "What should I focus on today?"

## Component: WeekSummary

`components/planning/WeekSummary.tsx`

Compact view of this week for the dashboard:
- Week theme
- Progress bar (outcomes completed / total)
- List of outcomes with status badges
- "See full week →" link to Weekly tab

## Component: GoalsSummary

`components/planning/GoalsSummary.tsx`

Compact quarterly goals for the dashboard:
- Each goal: title, mini progress bar, current/target, status badge
- Sorted by status (at_risk first, then on_track, then completed)
- Click to expand/edit inline

## Styling Notes
- Chat bubbles: user = `bg-emerald-900/20 border border-emerald-800/30`, assistant = `bg-[#1a1a1a] border border-[#2a2a2a]`
- Action suggestion cards: `bg-amber-900/10 border border-amber-700/30` with amber "Apply" button
- Applied actions: `bg-emerald-900/10 border border-emerald-700/30` with checkmark
- Smooth transitions on task check/uncheck
- Loading dots animation for chat

## Files to Create
1. `components/planning/ChatPanel.tsx`
2. `components/planning/TodayFocus.tsx`
3. `components/planning/WeekSummary.tsx`
4. `components/planning/GoalsSummary.tsx`
5. `app/api/planning/chat/route.ts`

## Files to Modify
1. `components/planning/PlanningClient.tsx` — restructure dashboard tab to use new components + chat panel, keep weekly/quarterly tabs mostly intact but enhanced

## Dependencies
- `@anthropic-ai/sdk` — install if not present (check package.json first)
- Everything else should already be available (React, lucide-react, Tailwind)

## Environment Variables Needed
- `ANTHROPIC_API_KEY` — for the chat endpoint. Check if it exists in the Vercel project env vars.

## Testing
After building, verify:
1. Dashboard loads with goals showing progress bars
2. Chat panel accepts messages and returns planning-aware responses
3. Chat-suggested actions can be applied and update the left panel
4. Tasks can be checked off
5. Weekly tab shows the 13-week grid
6. Quarterly tab shows all goals with edit capability
7. Mobile responsive — chat becomes a collapsible panel

## Important
- Keep all existing API routes working — don't break them
- The Supabase URL and key are already in env vars (SUPABASE_URL, SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY)
- Maintain the existing dark theme aesthetic
- Don't add any new npm dependencies besides potentially @anthropic-ai/sdk
- All components should be client components ("use client") since they use state/effects
