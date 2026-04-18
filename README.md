# MOTHERSHIP

The open-source command deck for AI agents. Build, run, and optimize AI agents with intelligent model routing, automated testing, real-time cost visibility, and complete operational observability — all self-hosted.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38BDF8)
![License](https://img.shields.io/badge/License-MIT-green)

<p align="center">
  <video
    src="https://github.com/ClaudevGuy/MotherShip/raw/master/assets/mothership-hero.mp4"
    controls
    muted
    playsinline
    loop
    width="900">
    <a href="https://github.com/ClaudevGuy/MotherShip/raw/master/assets/mothership-hero.mp4">Download the 28-second hero film</a>
  </video>
</p>

<p align="center">
  <sub><em>28-second silent editorial film — built in <a href="./remotion">Remotion</a>, not recorded.</em></sub>
</p>

## What is MOTHERSHIP?

MOTHERSHIP is a full-stack operations dashboard for AI agents. It gives you a single place to build agents from scratch, connect existing agents from any framework, watch every run stream in real time, auto-route to the cheapest model that still passes your evals, and keep every run replayable and auditable.

Core capabilities:

- **AI Agents** — Quick-create in 60 seconds or use the full 7-step builder. Real-time streaming execution with multi-turn conversations by default
- **Prompt Studio** — Git-like versioning with side-by-side diffs. Activate a version and the next run uses it — no deployment
- **Evals** — Two-engine scoring: deterministic string matching for facts, Claude-as-judge for tone and nuance
- **Workflows** — Visual pipeline builder (React Flow) for chaining agents, with step-level replay
- **Costs & Billing** — Per-agent tracking, auto-selection savings shown inline on every run, trailing-7-day forecast, cost-anomaly auto-pause. Full monthly budget config with live spend (from real LLM calls, not stored counters), per-category limits, alert thresholds, and end-of-month projection
- **Auto-Downshift** — Silent shadow testing on a % of production runs. When a cheaper model matches quality over a statistically meaningful sample, MotherShip surfaces a proposal on `/costs` — you approve, it swaps. 30-day cooldown on rejected triples. LLM-as-judge scoring (Haiku, calibrated 3-dimension rubric). Fully non-blocking; never affects production latency
- **Run Detail** — Every run gets its own page: full input/output, model selection reasoning, tier badge, savings vs Tier 1
- **Agent Runs Stream** — Unified live feed of every run across every agent (/logs → "Agent Runs" tab)
- **Deployments** — Service deployment tracking across dev/staging/production
- **Integrations** — First-class sidebar destination (`g i`) for connecting any service you already use. Add an integration by name + API key — MotherShip auto-detects known brands (OpenAI, Anthropic, GitHub, Slack, Stripe, Notion, Discord, Linear, Datadog, PagerDuty, Jira, Sentry, PostHog, Vercel, AWS…) and falls back to a first-letter badge for anything else. Services with a server-side adapter that does more than store a key (`github`, `slack`, `anthropic`, `openai`) earn a **Native** badge so the UI stays honest about depth of integration. All credentials encrypted at rest (AES-256). Outbound webhook subscriptions (HTTPS + HMAC-SHA256 signing secret) for 11 event types including `agent.run.completed`, `workflow.failed`, `deployment.started`, `incident.opened`
- **Logs & Observability** — Unified log stream, LLM call inspection with range filter (Today / 24h / 7d / 30d / All) and 15-second auto-refresh, server-computed stats that always match the selected window, distributed traces
- **Audit Log** — Every admin action, agent change, and deletion. Who, when, what. Searchable + filterable
- **Incidents** — Alert rules, on-call scheduling, incident management
- **Analytics** — User engagement, growth metrics, agent performance, health drift detection
- **Notifications** — Real-time alerts on agent failures, workflow completions, cost thresholds, auto-pause events
- **Team** — Member management, role-based access (admin/developer/agent-manager/viewer), scoped API keys
- **Settings** — Grouped nav with icons and descriptions (General / Appearance / Notifications / Auto-Downshift / Data & Privacy / Security / Audit Log). Section header mirrors the active nav item for clear orientation
- **External Agent SDK** — `@mothership/sdk` ingests run events from CrewAI, LangGraph, Paperclip, AutoGen, or any custom framework

## Quick Start

### Prerequisites

- Node.js 18+
- A PostgreSQL database ([Neon](https://neon.tech) free tier works great)

### 1. Clone and install

```bash
git clone https://github.com/ClaudevGuy/MotherShip.git
cd MotherShip
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in these required values:

```env
# Get from neon.tech dashboard (or any PostgreSQL provider)
DATABASE_URL=postgresql://user:pass@host/dbname

# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET=your-random-secret-here

# Generate with: openssl rand -hex 32
ENCRYPTION_KEY=your-random-hex-here
```

### 3. Set up the database

```bash
npx prisma db push    # Create all tables
npx prisma db seed    # Create default project + admin user
```

### 4. Start the dashboard

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). When the project is empty, the overview shows a color-coded 3-step onboarding (Create / Run / Evaluate) — each card tinted in its own accent (amber, purple, emerald) with a consistent footer baseline. Once an agent exists, the overview switches to the live dashboard:

- **System health strip** — pulsing status dot, live/degraded/critical states, environment tag
- **Cost Burn widget** — trailing spend total, working 7d/14d/30d/90d range selector, and a ±% trend vs the prior period
- **Top Issues** — `HEALTHY`/`ACTIVE` pill, incident feed or a glowing emerald all-clear empty state

## Security & Threat Model

**MotherShip is designed to run locally on your own machine.** Its security model assumes the attack surface is limited to `localhost` — a single trusted user, on a single trusted OS, reachable only from that machine's own browser. Under that assumption, the app is safe to use and distribute.

If you break that assumption, you break the model.

### The hard rules

- **Do not expose the server to the network.** That includes:
  - Running `ngrok http 3003`, Cloudflare Tunnel, `localtunnel`, or similar
  - Binding to `0.0.0.0` instead of `localhost` / `127.0.0.1`
  - VS Code "Forward a Port" / GitHub Codespaces port-share
  - Exposing it over Tailscale, ZeroTier, WireGuard, or corporate VPN
  - Opening a firewall rule for port 3003

  If any of the above is true, auth becomes bypassable and the registration endpoint is reachable by anyone who can route to your machine.

- **Generate your own secrets.** `NEXTAUTH_SECRET` and `ENCRYPTION_KEY` must be unique to your install. Never copy them from a tutorial, a friend's `.env`, or a sample file. Two installs sharing an `ENCRYPTION_KEY` can decrypt each other's stored credentials.

  ```bash
  openssl rand -base64 32   # NEXTAUTH_SECRET
  openssl rand -hex 32      # ENCRYPTION_KEY
  ```

- **Set `ALLOW_REGISTRATION=false` after you create your first account.** This closes the public signup endpoint. Leaving it open is only safe if the server is strictly loopback-bound and your OS user account is trusted.

- **Back up `ENCRYPTION_KEY` somewhere outside the project folder.** Losing it renders every stored integration credential unrecoverable (they're AES-256-GCM sealed with auth tags). A password manager entry works.

- **Treat `.env` like a password manager entry.** It's gitignored by default — keep it that way. Don't sync the project folder to Dropbox/iCloud/Drive without encryption. Don't pack it into archives you share.

### What's explicitly out of scope

- Multi-tenant isolation between users on the same install
- Defense against an attacker with local OS access
- Defense against supply-chain attacks on npm dependencies (run `npm audit` periodically)
- Resistance to DoS — known Next.js DoS CVEs exist at the pinned version; they only matter if the server is reachable from untrusted networks, which it shouldn't be

### If you leak an API key

Rotate it at the provider immediately (console.anthropic.com, platform.openai.com, etc.), then remove the old integration from MotherShip and re-add with the new key.

---

## Adding AI Providers

To run AI agents, you need at least one AI provider API key.

### Option A: Through the UI

1. Go to **Integrations** (sidebar, or press `g i`)
2. Click **+ Add Integration** (or pick from the Popular chips on the empty state)
3. Type a name — the icon auto-detects for recognized brands (try "Anthropic" or "OpenAI")
4. Paste your API key and pick a category — it's encrypted at rest in the database
5. Create an agent and run it — it picks up the key automatically

### Option B: Through `.env`

```env
# Anthropic (Claude) — get from console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI — get from platform.openai.com
OPENAI_API_KEY=sk-...

# Google AI — get from aistudio.google.com
GOOGLE_AI_API_KEY=...
```

Restart the dev server after adding keys to `.env`.

## Core Features

### Agent Creation — Two Paths

**Quick Create** (60 seconds)

On `/agents`, click **Quick Create** on the empty-state hero (or **Create Agent** in the header once you have agents). A modal pops up: name + system prompt + Run button. Defaults: auto model selection, manual trigger, session memory. Good enough for 90% of cases.

**Full Builder** (7-step wizard)

For production agents that need tools, persistent memory, scheduled triggers, or custom model strategies. Use the **Advanced Builder** button on the empty state, the "Advanced Setup" link in the quick-create modal, or go directly to `/agents/builder`.

The same empty-state pattern carries across `/workflows`, `/deployments`, and `/evals` — header action buttons hide when the page is empty so the center hero is the only path, and reappear once the user has data. On `/workflows` specifically, the empty state also exposes a **Visual Builder** shortcut to `/workflows/builder` so the React Flow canvas stays reachable without any existing workflows.

### Agent Templates

8 pre-built agent templates on the Agents page for 1-click deployment — they now create the agent immediately without going through the wizard:

- **Code Reviewer** — Reviews code for bugs, security, best practices (Sonnet, Auto)
- **Security Scanner** — Analyzes code for security vulnerabilities (Opus, Quality-First)
- **Documentation Writer** — Generates technical docs from code (Haiku, Cost-First)
- **Data Pipeline Agent** — Processes and validates data pipelines (Haiku, Cost-First)
- **Test Writer** — Generates comprehensive test suites (Sonnet, Auto)
- **Performance Optimizer** — Identifies performance bottlenecks (Sonnet, Auto)
- **API Designer** — Designs RESTful/GraphQL APIs (Sonnet, Auto)
- **Incident Responder** — Analyzes incidents and suggests fixes (Opus, Quality-First)

### Agent Execution — Multi-Turn Conversations

Agents now hold a conversation, not just a single-shot request:

1. Open an agent, click the **Execution** tab
2. Type a message → watch tokens stream live with a pulsing status dot, terminal glow border, live token counter, and elapsed timer
3. When the assistant finishes, per-turn stats appear below the bubble: duration, tokens in/out, cost, savings vs Tier 1, tier badge
4. Continue the conversation — the next message sends the full prior history for context
5. Click **New Conversation** to reset; **Retry** on any failed turn

Every run creates a record with the full input, output, model, tier, tokens, and cost — accessible from the History tab or by clicking any row in the Agent Runs stream.

### Run Detail Page

Click any row in an agent's history, or any line in the cross-agent Runs stream, to open that run's dedicated page at `/agents/[id]/runs/[runId]`. You get:

- **Status + timestamp** with icon
- **4 stat tiles** — duration, tokens in/out, cost, model
- **Model selection panel** — which tier, why the selector picked it, whether it was upgraded mid-flight, selection overhead in ms
- **Input block** — full prompt, copyable
- **Output block** — full response, copyable
- **Tool Use section** — ready for when tool invocation is wired (shows honest empty state today)

### Intelligent Model Selection

The routing engine profiles every task on the way in and picks the lowest tier that will pass.

| Tier | Anthropic | OpenAI | Google |
|------|-----------|--------|--------|
| Tier 1 (complex) | claude-opus-4-6 | gpt-4o | gemini-2.5-pro |
| Tier 2 (balanced) | claude-sonnet-4-6 | gpt-4o-mini | gemini-2.0-flash |
| Tier 3 (simple) | claude-haiku-4-5 | gpt-3.5-turbo | gemini-1.5-flash-8b |

Safety overrides force Tier 1 for production-critical paths, security scans, first runs, and high-error-cost tasks.

**Savings are visible everywhere:**
- Inline on every run: "Saved $0.0287 vs Tier 1"
- Banner on the overview: "Auto-selection saved you $XX.XX this month"
- Full breakdown on `/costs`: tier distribution, actual vs baseline, upgrade events

### Cost Forecasting

On the `/costs` overview tab, a live forecast replaces a static total:

- **"At this pace: $X.XX this month"** — using the trailing-7-day average daily spend × remaining days
- **Week-over-week trend** — ↑/↓ with percent change vs prior 7 days
- **Budget pressure indicator** — progress bar turns red if projected to exceed budget, amber above 85%, green otherwise

### Cost Anomaly Auto-Pause

Automatic protection against runaway agents:

- Configure in **Settings > Notifications** (toggle + hourly threshold, default $10)
- After every run, the system checks hourly spend for that agent
- If exceeded: agent is paused, a warning notification is created, and an audit entry logged
- Paused agents resume manually from the agent detail page

### Auto-Downshift

Autonomous cost reduction that never degrades quality:

1. Enable in **Settings > Auto-Downshift** (per-project). Default sample rate 5%, min sample size 100, parity threshold 95%
2. A small % of production runs dispatch a **parallel shadow call** on the next-cheaper tier (Opus → Sonnet → Haiku). The dispatcher is fully non-blocking — the production response ships before the shadow begins
3. Each pair is scored by an **LLM-as-judge** (claude-haiku-4-5) using a calibrated 3-dimension rubric (correctness + helpfulness + completeness). Fail-closed on parse errors so parity analysis only considers cleanly-judged pairs
4. Once an agent has enough samples and parity crosses the threshold, a proposal appears at the top of `/costs` with agent name, model transition (e.g. `claude-opus-4-6 → claude-sonnet-4-6`), parity %, and estimated monthly savings (projected from the agent's full 30-day production spend, not the tiny shadow sample)
5. Approve → the agent's strategy is updated, audit-logged, and a success notification fires. Dismiss → 30-day cooldown so the same triple doesn't nag you again

**Budget — Fully Configurable**

On `/costs > Budget`:

- Set a **monthly limit** (optionally multiple per-category budgets like "Models" / "Experimentation")
- `spent` is computed live from `LlmCall` rows in the current calendar month — never a stale DB column
- Per-budget **alert threshold** slider (50–100%, default 80%); rows show an **Alert** badge when crossed and **Over** when past 100%
- **End-of-month projection** panel reuses the trailing-7-day forecast — see if you're on track to overrun before you do
- Admin-only create/update/delete, every action audit-logged

### Cross-Agent Run Stream

Every run across every agent in the project, newest first, at `/logs` → **Agent Runs** tab:

- Status filter (success / failed / running)
- Search across agent name, input, and output
- 5-second live polling with pause toggle
- Click any row to open the run detail page
- Color-coded status dots (green success, red failed, amber running)

### Prompt Studio

Git-like prompt versioning:

- **Editor** — Monospace editor with line numbers and live token counter
- **Playground** — Test prompts against Haiku / Sonnet / Opus with streaming output, adjustable temperature and max tokens
- **Versions** — Every save creates an immutable version. Side-by-side diff viewer
- **Activation** — Activate a version and the agent uses it on the very next run. No deployment. Roll back with one click
- **Agent Linking** — Link a prompt to an agent via `__PROMPT_STUDIO__:{id}` reference

### Evals

Create test suites to measure and track agent quality:

1. **Create a suite** — Name it, pick an agent, add test cases
2. **Define test cases** — Input text + pass criteria (e.g. "mentions pricing", "under 100 words", "professional tone")
3. **Run the suite** — Each case executes against the agent (sync), scores the output, reports pass/fail
4. **Track quality** — Score history with sparklines, pass/fail breakdowns, case-by-case results

**Two scoring engines run in parallel:**
- **String matching** — Deterministic: `mentions [X]`, `under N words`, `includes code block`, `starts with`, `does not mention [X]`
- **AI Judge** — For tone and nuance: claude-haiku-4-5 evaluates PASS/FAIL

### Visual Workflow Builder

Chain agents into pipelines on a React Flow canvas:

- Custom node types: Trigger (manual / schedule / webhook / event), Agent, End
- One trigger per workflow — the sidebar marks the active trigger and clicking a different one swaps it in place (keeps connections intact)
- Animated connection edges
- Validation before activation
- Theme-aware node palette — the End terminal renders as emerald on paper, neon on charcoal
- **Real execution** — Calls agents via the sync endpoint, pipes output between steps, saves complete `WorkflowRun` records with step-level results

### Audit Log

Every create, update, delete — tracked in `AuditLogEntry`. View at **Settings > Audit Log**:

- Search across user, action, target, details
- Filter by specific action (e.g. `agent.delete`, `prompt.activate`)
- Pagination (50 entries per page)
- Color-coded actions: create (green), update (amber), delete (red)
- Full timestamp with second precision

### Notification System

Real-time notifications with auto-alerts:

- Bell icon in topbar with unread count + pulse animation
- 380px slide-over panel grouped by Today / Yesterday / Earlier
- Auto-fired on: agent run success/failure, workflow completion/failure, eval completion, cost threshold exceeded, auto-pause triggered
- 30-second polling
- Mark read, mark all read, dismiss, delete

### External Agent Integration

Connect agents from any external framework. Events show up on the Overview within seconds.

**Via SDK:**

```bash
npm install @mothership/sdk
```

```typescript
import { Mothership } from '@mothership/sdk'

const mc = new Mothership({
  url: 'https://your-dashboard.com',
  apiKey: 'mc_your_key',
  source: 'crewai',
})

await mc.trackRun({
  agent: { id: 'researcher', name: 'Market Researcher' },
  status: 'completed',
  tokens: { in: 842, out: 1204 },
  cost: 0.0384,
  model: 'claude-sonnet-4-6',
})
```

**Via raw API:**

```bash
curl -X POST https://your-dashboard.com/api/events/ingest \
  -H "Authorization: Bearer mc_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "agent.run.completed",
    "source": "my-app",
    "agent": { "id": "agent-1", "name": "My Agent" },
    "data": { "cost": 0.05, "duration": 3000 }
  }'
```

**Managing external agents:**
- Appear on the Overview in the "External Agents" section
- Hover any card to reveal a trash icon → ConfirmDialog deletes the agent + all its ingest events
- Full list at `/agents?tab=external`

### Delete Safeguards

All destructive operations use a consistent ConfirmDialog pattern:

- **Agents** — Trash icon on each list row, and in the detail page header. Confirms with the agent name, warns cascade will remove all runs/evals/history
- **External agents** — Hover-reveal trash icon on each card
- **Kill Switch** — Ctrl+K → "Kill Switch" or the Overview quick action. Confirms, then calls `/api/agents/kill-all`

### Command Palette

`Ctrl+K` (or `Cmd+K`) opens a unified command palette:

- **Navigation** — Jump to any page with `g + [key]` (see shortcuts below)
- **Quick Actions** — Deploy Agent (→ builder), Run Eval (→ dialog), New Workflow (→ dialog), Kill Switch (→ confirm + kill-all)

### Dark & Light Themes

Both themes are first-class and share the same editorial grammar as the landing page:

- **Dark** (default) — Charcoal paper with cream ink, iconic neon accents (live dot, success terminal) against a deep background
- **Light** — Warm uncoated paper (`#f5f1e8`), printed ink (`#0e0e0e`), oxblood accent (`#c83524`), emerald semantic greens that stay legible on cream
- Semantic colors are driven by CSS tokens (`--color-live-*`, `--color-end-rgb`, `--color-success`, etc.) so a new theme is a token swap, not a component sweep
- Toggle in the topbar or the `/settings` → Appearance tab

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/                     # All dashboard pages
│   │   ├── overview/                    # Home — unified layout, onboarding in empty state
│   │   ├── agents/                      # Agent list + quick-create modal
│   │   │   ├── builder/                 # 7-step wizard for full config
│   │   │   └── [id]/
│   │   │       ├── page.tsx             # Agent detail w/ LiveExecutionPanel
│   │   │       └── runs/[runId]/        # Individual run detail page
│   │   ├── workflows/                   # Visual pipeline builder
│   │   ├── prompts/                     # Prompt Studio w/ versioning
│   │   ├── evals/                       # Eval suites + results + diff
│   │   ├── deployments/                 # Deployment tracking
│   │   ├── costs/                       # Costs + trailing-7d forecast
│   │   ├── analytics/                   # User + agent analytics + health
│   │   ├── logs/                        # Stream / Errors / LLM / Traces / Agent Runs
│   │   ├── team/                        # Members, invites, API keys
│   │   ├── incidents/                   # Alerts & incidents
│   │   ├── settings/                    # General / Appearance / Notif / Data / Security / Audit
│   │   ├── tutorial/                    # Interactive tutorial w/ ?section= deep links
│   │   └── profile/                     # User profile
│   └── api/
│       ├── agents/
│       │   ├── route.ts                 # CRUD
│       │   ├── [id]/route.ts            # Detail + DELETE
│       │   ├── [id]/execute/route.ts    # Streaming SSE with history[] for multi-turn
│       │   ├── [id]/execute-sync/       # Sync for eval + workflow engines
│       │   ├── [id]/runs/route.ts       # Runs for one agent
│       │   ├── [id]/runs/[runId]/       # Individual run detail
│       │   ├── runs/route.ts            # Cross-agent run aggregator
│       │   ├── external/route.ts        # List external agents
│       │   ├── external/[id]/           # DELETE external agent
│       │   └── kill-all/                # Emergency stop
│       ├── evals/                       # Suites, cases, runs
│       ├── prompts/                     # Prompt CRUD + versioning + playground
│       ├── events/ingest/               # External agent webhook
│       ├── workflows/                   # CRUD + run pipeline
│       ├── notifications/               # List, read, delete
│       ├── costs/                       # Aggregation + model-savings endpoint
│       ├── team/
│       │   ├── members/                 # Members, invites
│       │   ├── api-keys/                # Scoped key management
│       │   └── audit-log/               # Powers the audit log viewer
│       └── ...
├── components/
│   ├── layout/                          # Sidebar, Topbar, CommandPalette, ProjectSwitcher
│   ├── shared/                          # GlassPanel, MetricCard, ConfirmDialog, etc.
│   ├── overview/                        # Widgets + onboarding
│   ├── workflows/                       # React Flow nodes + edges
│   ├── agents/
│   │   └── LiveExecutionPanel.tsx       # Multi-turn chat transcript
│   └── team/                            # Invite + API key modals
├── stores/                              # Zustand state
├── lib/
│   ├── model-selector.ts                # Auto-selection engine (tier config + rates)
│   ├── agent-profiler.ts                # Task complexity profiler
│   ├── cost-guard.ts                    # Cost anomaly auto-pause checker
│   ├── create-notification.ts           # Notification helper
│   ├── audit.ts                         # logAuditEvent() helper
│   ├── store-cache.ts                   # Session-based fetch cache
│   ├── api-client.ts                    # Project-aware fetch wrapper
│   └── ...
├── types/                               # TypeScript interfaces
└── packages/sdk/                        # @mothership/sdk npm package

landing/
└── index.html                           # Editorial publication landing page (served via npx serve)
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **State**: Zustand (stores are project-scoped and cached per session)
- **UI**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts (area, donut, sparklines)
- **Canvas**: React Flow (@xyflow/react)
- **AI**: Anthropic SDK (direct, with streaming + sync)
- **Auth**: NextAuth.js (email + GitHub + Google OAuth, optional)
- **Rate limiting**: In-memory / Redis (configurable)
- **Encryption**: AES-256 for integration secrets at rest

## Customization

- **Branding** — Colors in `src/app/globals.css`, wordmark in `ProjectSwitcher.tsx`
- **Pages** — Add/remove in `src/app/(dashboard)/`; register in `src/lib/constants.ts`
- **Navigation** — Sidebar entries in `src/lib/constants.ts`; command palette picks them up automatically
- **Database** — Modify `prisma/schema.prisma` and run `npx prisma db push`
- **Model tiers & costs** — Adjust in `src/lib/model-selector.ts`
- **Routing heuristics** — Profile logic in `src/lib/agent-profiler.ts`
- **Design system** — See `DESIGN.md` for full token reference

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Command palette |
| `?` | Show all shortcuts |
| `g o` | Overview |
| `g a` | AI Agents |
| `g w` | Workflows |
| `g p` | Prompt Studio |
| `g e` | Evals |
| `g d` | Deployments |
| `g $` | Costs & Billing |
| `g n` | Analytics |
| `g l` | Logs (includes Agent Runs stream) |
| `g i` | Integrations |
| `g t` | Team |
| `g !` | Incidents |
| `g s` | Settings |
| `g h` | Tutorial |

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Set environment variables in the Vercel dashboard (same as `.env`). The Prisma schema is auto-pushed during build if you add `prisma generate && prisma db push` to your build command, or run it manually from your local machine against the production `DATABASE_URL`.

## License

MIT — self-host it, extend it, fork it, keep it.
