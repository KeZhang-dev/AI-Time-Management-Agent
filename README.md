# <img src="frontend/public/Time%20Tracker-svg.svg" alt="KONER logo" width="28" height="28" valign="middle" /> KONER

![Version](https://img.shields.io/badge/version-1.0.0-blueviolet)
![Frontend](https://img.shields.io/badge/frontend-React%2019%20%2B%20TypeScript-61DAFB?logo=react&logoColor=white)
![Backend](https://img.shields.io/badge/backend-ASP.NET%20Core%20(.NET%2010)-512BD4?logo=dotnet&logoColor=white)
![Database](https://img.shields.io/badge/database-PostgreSQL%2016-4169E1?logo=postgresql&logoColor=white)
![AI Model](https://img.shields.io/badge/AI%20model-Gemini%203.5%20Flash--Lite-8E44AD)

**KONER** is an AI-powered time management agent — an application that doesn't just track your time, but actively observes it, reasons about it, and proposes changes you can choose to act on.

---

## Table of contents

1. [Overview](#1-overview)
2. [Core Agent Workflow](#2-core-agent-workflow)
3. [Features](#3-features)
4. [Agent Tools](#4-agent-tools)
5. [Memory System](#5-memory-system)
6. [Scheduling](#6-scheduling)
7. [Architecture](#7-architecture)
8. [API Overview](#8-api-overview)
9. [Tech Stack](#9-tech-stack)
10. [AI Model](#10-ai-model)
11. [Local Development](#11-local-development)
12. [Deployment](#12-deployment)
13. [Security & Data Isolation](#13-security--data-isolation)
14. [Known Limitations](#14-known-limitations)
15. [Roadmap](#15-roadmap)
16. [Reflection / Lessons Learned](#16-reflection--lessons-learned)
17. [Screenshots](#17-screenshots)
18. [License](#18-license)

---

## 1. Overview

KONER started as a plain time-tracking app — start/stop a timer, categorize it, review stats on a dashboard. It has since grown an AI layer (the **Solution** chat) that turns those tracked records into something more useful: an agent that can look at your actual data, reason about it, and take a concrete next step on your behalf, with your explicit approval.

**The problem it solves:** most time-tracking tools are passive — they store data and leave the analysis and planning to you. KONER's agent actively closes that loop: it reads your real time-record history and memory, recommends a structured schedule for what's left of your day (or week), and — once you approve it — turns that recommendation into an actual schedule the app can show, edit, and manage.

**What makes it an agent, not a chatbot:** a plain LLM chatbot answers from what you type and what it was trained on. KONER's Gemini-backed agent instead runs a **multi-step tool-calling loop** — it decides which of eight backend tools to call (read your records, read your memory, save a new memory, stage a schedule), inspects the results, and can call more tools before producing a final answer. It never writes to your real schedule directly: the one tool that can propose a change (`propose_schedule`) only ever stages a **pending proposal**; a separate, human-driven approval step in the backend is what actually creates a schedule. The model reasons and recommends; the backend decides what's allowed and executes.

---

## 2. Core Agent Workflow

```
Observe → Analyze → Recommend → Approval → Execute → Remember
```

| Step | What happens | Where |
|---|---|---|
| **Observe** | The agent calls read-only tools to pull the user's real time records, stats, or saved memory. | `AgentToolRegistry` → `IAgentTool` implementations → PostgreSQL (scoped by `userId`) |
| **Analyze** | Gemini reasons over the tool results plus the conversation so far. | `AiAgentService`'s tool-calling loop ↔ Gemini `generateContent` |
| **Recommend** | If the user asked for planning help, the model calls `propose_schedule` with a structured plan instead of just describing one in prose. | `ProposeScheduleTool` → writes a `Pending` row to `schedule_proposals` only |
| **Approval** | The user reviews the proposal in the Solution chat UI and explicitly clicks Apply (or Cancel). Gemini has no path to do this itself. | `ScheduleProposalsController.Approve` / `.Cancel` |
| **Execute** | Only the approval endpoint — never the model — writes concrete rows to the `schedules` table, after re-validating the plan server-side. | `ScheduleProposalsController` + `ScheduleValidation` |
| **Remember** | When the user shares something durable (a preference, habit, goal), the model calls `save_user_memory` so future conversations can use it. | `SaveUserMemoryTool` → `memories` table |

The important architectural point: **the LLM never has write access to real data.** Every tool that reads data is scoped to the authenticated user; the only tool that "writes" (`propose_schedule`) writes a disposable, expiring draft — not the real `schedules` table. Converting a draft into a real schedule requires a separate authenticated HTTP call that only the frontend's Apply button makes, and that call re-validates the plan from scratch rather than trusting what the model staged.

---

## 3. Features

All of the following exist in the current codebase (verified against controllers, models, and frontend pages):

- **Time tracking** — start/pause/stop a live timer, or add a record manually with either an end time or a duration (`TimeTracker`, `RecordForm`).
- **Dashboard / time analysis** — today's KPIs, a category breakdown chart, and a "Recent records" table scoped to the last 7 days (older records aren't deleted, just outside the default view — the agent can still see them all).
- **AI Solution chat** — a persistent chat interface backed by the Gemini tool-calling agent, with Markdown-rendered replies.
- **Tool calling** — an 8-tool registry (time records, memory, scheduling) the agent can invoke mid-conversation; see [Agent Tools](#4-agent-tools).
- **Persistent Memory** — durable, user-specific facts saved by the agent and reused across conversations (see [Memory System](#5-memory-system)).
- **Schedule generation** — the agent can turn a time constraint ("I have 2 hours tonight") into a structured, time-blocked plan.
- **Human-in-the-loop schedule approval** — every agent-generated plan is a `Pending` proposal until the user explicitly approves or cancels it in the UI.
- **Schedule management** — once applied, a schedule can be viewed, edited (title, date, times, activity, description), or deleted directly from the Solution sidebar — independent of the AI approval flow.
- **Conversation persistence / reset behavior** — chat history is saved to the database and reloaded across sessions; the visible chat window rolls over on a 24-hour basis (or on demand via "New Chat"), which only affects what's *displayed*, not what's stored.
- **Authentication & profile** — JWT-based signup/login, editable display name and avatar, read-only account identifier.

---

## 4. Agent Tools

Every tool implements `IAgentTool` and is registered in `AgentToolRegistry`, which exposes each one to Gemini as a function declaration (name, description, JSON-schema parameters) and resolves the model's function-call requests back to a concrete implementation by name.

**The tool-calling loop** (`AiAgentService.HandleUserMessageAsync`): the user's message is sent to Gemini along with the full list of tool declarations. If Gemini responds with one or more function calls, each is executed (always with the `userId` from the caller's JWT — never from the model) and the results are appended to the conversation history as a new turn; the whole exchange is sent back to Gemini. This repeats for up to **6 iterations** before the agent gives up and returns a fallback message, or stops early as soon as Gemini returns a plain text answer instead of a function call.

| Tool | Purpose | Data access |
|---|---|---|
| `get_today_records` | Today's completed time records, total hours, and count | Read |
| `get_recent_records` | Most recent completed records (default 10, max 50) | Read |
| `get_weekly_summary` | Hours per day and per category for a given week (current or up to 8 weeks back) | Read |
| `get_category_breakdown` | Category totals and percentage share over a lookback window (default 30 days, max 365) | Read |
| `get_records_by_date_range` | Completed records within an explicit date range (max 92 days) | Read |
| `get_user_memory` | Long-term facts previously saved about the user (last 30 days) | Read |
| `save_user_memory` | Saves one durable, user-specific fact for future conversations | Write (`memories` only) |
| `propose_schedule` | Stages a structured schedule recommendation for the user to review | Write (`schedule_proposals` only — never `schedules`) |

---

## 5. Memory System

- **Storage**: a plain `memories` table (`id`, `user_id`, `content`, `created_at`, `updated_at`) — one row per remembered fact, as free-text content (not embeddings).
- **Reading**: `get_user_memory` returns memories updated/created within the last 30 days, most recent first. The model decides when to call it (e.g. before giving planning advice), not on every message.
- **Writing**: `save_user_memory` is only meant to be called for genuinely durable information (a stated preference, recurring habit, or long-term goal) — not greetings, one-off questions, or anything already retrievable from the time-record tools. A duplicate check (case-insensitive exact match) refreshes the existing row's timestamp instead of creating a copy, and a small blocklist rejects obviously adversarial content (e.g. prompt-injection phrases) before it can be stored and later replayed back into the model's own context.
- **User isolation**: every query and write is filtered by `UserId` from the authenticated JWT; there is no code path for one user's memory to be read by another.
- **Retention**: memories older than 30 days are pruned lazily — the next time that user's memory is written to, expired rows are deleted first. There's no background job; cleanup only happens opportunistically, scoped to that one user.
- **What it stores**: durable facts about the user, not conversation transcripts. The full chat transcript is stored separately (see below) purely for UI continuity — Memory is a curated, much smaller layer on top of it.

---

## 6. Scheduling

KONER treats "the agent suggested a plan" and "the plan is real" as two different things, backed by two different tables:

- **`schedule_proposals`** — a disposable, short-lived draft (`Pending` / `Approved` / `Cancelled` / `Expired` / `Failed`), created only by `propose_schedule` and expiring **2 hours** after creation.
- **`schedules`** — the real, applied schedule, created only by the approval endpoint.

**Why proposals aren't executed immediately:** the model has no reliable way to guarantee a plan is safe or sane (overlapping blocks, a start time in the past, an unreasonable total length). Rather than trust it, every proposal is validated twice — once when staged, once again at approval time — by the same shared `ScheduleValidation` logic (max 12 items, max 16 hours total, date within 14 days, no overlaps, no zero/negative-length blocks). Staging additionally rejects a same-day plan that starts before the current time, closing a gap where prompt-only instructions weren't reliable enough to prevent the model from proposing a stale start time.

**Approval flow:**
1. The user clicks **Apply** on a proposal shown in the Solution chat.
2. `ScheduleProposalsController.Approve` atomically flips the proposal from `Pending` to `Approved` — a conditional `UPDATE` that only succeeds if it's still pending and unexpired, so a duplicate/concurrent click just affects zero rows instead of double-applying.
3. The stored plan is re-validated from scratch.
4. Only if validation passes are concrete `Schedule` rows created — one per time block, carrying the title and description forward from the proposal but independent of it afterward.

**Cancel** works the same way (`Cancel` conditionally flips `Pending` → `Cancelled`), and a proposal that's already been resolved (approved, cancelled, or expired) returns a `409 Conflict` instead of silently doing nothing, so the UI can tell the user what actually happened.

**After approval**, a schedule is just data the user owns: it can be edited (title, date, times, activity, description) or deleted from the Solution sidebar without touching the AI approval flow, and deleting one never touches time records, memory, or other schedules.

This is the project's clearest human-in-the-loop boundary: the model can *draft*, but only an authenticated, explicit user action can *commit*.

---

## 7. Architecture

```
┌───────────────────────────┐
│      React Frontend        │   Dashboard · Record · Solution chat · Profile
│   (Vite SPA, TypeScript)   │
└─────────────┬───────────────┘
              │ HTTPS + JWT bearer token
              ▼
┌───────────────────────────┐
│    ASP.NET Core Web API    │   Auth · TimeRecords · Ai · ScheduleProposals ·
│                             │   AppliedSchedules · Conversation controllers
└─────────────┬───────────────┘
              │ AiController.Analyze()
              ▼
┌───────────────────────────┐
│       AiAgentService        │   Tool-calling loop, capped at 6 iterations
└─────────────┬───────────────┘
              │ generateContent (history + tool declarations)
              ▼
┌───────────────────────────┐
│         Gemini API          │   gemini-3.5-flash-lite
└─────────────┬───────────────┘
              │ requested function calls
              ▼
┌───────────────────────────┐
│    Agent Tool Registry      │   8 × IAgentTool (time records, memory,
│                             │   propose_schedule) — always userId-scoped
└─────────────┬───────────────┘
              │ EF Core (Npgsql)
              ▼
┌───────────────────────────┐
│         PostgreSQL          │   users · time_records · memories ·
│                             │   schedules · schedule_proposals ·
│                             │   conversation_messages
└───────────────────────────┘
```

**Human-in-the-loop boundary:** Gemini can only ever reach `propose_schedule`, which writes a `Pending` row to `schedule_proposals`. Only `ScheduleProposalsController.Approve` — triggered by an explicit user click, never by the model — writes to `schedules`.

---

## 8. API Overview

Base path: `/api`. All endpoints except `auth/signup` and `auth/login` require a JWT bearer token. This is a concise overview, not full API documentation.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/signup` | Create an account |
| `POST` | `/auth/login` | Log in, receive a JWT |
| `GET` | `/auth/me` | Current user's profile |
| `PUT` | `/auth/me/name` | Update display name |
| `PUT` | `/auth/me/avatar` | Update avatar (image data URL) |
| `GET` | `/time-records` | List records (`from`/`to`/`category` filters) |
| `POST` | `/time-records` | Create a record |
| `GET` / `PUT` / `DELETE` | `/time-records/{id}` | Get / update / delete a record |
| `GET` | `/time-records/stats` | Total hours + breakdown by category |
| `POST` | `/ai/analyze` | Send a message to the Agent (runs the tool-calling loop) |
| `GET` | `/conversation` | Load persisted Solution chat history |
| `POST` | `/schedule-proposals/{id}/approve` | Approve a staged proposal → creates real schedule rows |
| `POST` | `/schedule-proposals/{id}/cancel` | Cancel a pending proposal |
| `GET` | `/schedules` | List applied schedules |
| `GET` / `PUT` / `DELETE` | `/schedules/{id}` | View / edit / delete an applied schedule |

---

## 9. Tech Stack

**Frontend**
- React 19.2, TypeScript ~6.0
- Vite 8
- Tailwind CSS 4
- Radix UI primitives, `lucide-react` icons
- React Router 7
- `react-markdown` (chat replies), `date-fns` (date formatting)

**Backend**
- ASP.NET Core Web API on **.NET 10**
- Entity Framework Core 10 with `Npgsql.EntityFrameworkCore.PostgreSQL` 10.0.3
- JWT authentication (`Microsoft.AspNetCore.Authentication.JwtBearer`)
- `BCrypt.Net-Next` for password hashing
- Swashbuckle / Swagger (development only)

**Database**
- PostgreSQL 16 (`postgres:16-alpine`), run locally via Docker Compose

**AI**
- Google Gemini API, called directly over HTTP (no SDK) via a custom `IGeminiService`

---

## 10. AI Model

The application is currently configured to use **`gemini-3.5-flash-lite`** (see `backend/TimeTracker.Api/appsettings.json`, `Gemini:Model`), called against the `v1beta` Gemini REST API.

There is currently no model-switching capability: `IGeminiService` has a single implementation wired to one configured model, and the tool-calling loop, system prompt, and validation logic are not model-aware. The Profile page includes an **AI Model** selector UI that lists "Gemini" as the only option and displays "Gemini 3.5 Flash-Lite" as the active model — it's intentionally read-only for now, a placeholder for when additional providers/models are added, not a functioning switch.

---

## 11. Local Development

### Prerequisites

- .NET SDK 10+
- Node.js 20+
- Docker Desktop (for the bundled PostgreSQL container) — or your own PostgreSQL 16 instance
- A Google Gemini API key (required for the Solution chat / AI features; the rest of the app works without one)

### 1. Database

```bash
docker compose up -d
```

Starts PostgreSQL on `localhost:5432` (db/user/password: `timetracker`). Using your own instance instead? Update `ConnectionStrings:Default` in `backend/TimeTracker.Api/appsettings.json`.

### 2. Backend configuration

The Gemini API key is intentionally left blank in `appsettings.json` and should be set via .NET User Secrets (the project already has a `UserSecretsId`) rather than committed:

```bash
cd backend/TimeTracker.Api
dotnet user-secrets set "Gemini:ApiKey" "YOUR_GEMINI_API_KEY"
```

Without a key, everything except the AI Solution chat still works — `IGeminiService` throws a clear configuration error only when a Gemini call is actually made.

### 3. Database migrations

```bash
cd backend/TimeTracker.Api
dotnet ef database update
```

### 4. Backend startup

```bash
dotnet run
```

Listens on `https://localhost:7267` and `http://localhost:5224`. Swagger UI is available at `/swagger` in development. If running from Visual Studio, make sure the **https** launch profile is selected — the frontend's default config expects port 7267.

### 5. Frontend startup

```bash
cd frontend
npm install
cp .env.example .env   # defaults to https://localhost:7267/api
npm run dev
```

Runs at `http://localhost:5173`.

---

## 12. Deployment

**Current status: local/development only.** There is no deployed instance, no CI/CD pipeline, and no production configuration (no `appsettings.Production.json`, no cloud infrastructure files) in this repository — the app runs via `dotnet run` and `npm run dev` against a local or Docker-hosted PostgreSQL.

### Planned deployment (not yet implemented)

The intended direction is **Azure**: an Azure Database for PostgreSQL instance, the ASP.NET Core API on Azure App Service (or a container-based equivalent), and the built frontend served as a static site (e.g. Azure Static Web Apps). This is a future goal, not current functionality.

---

## 13. Security & Data Isolation

- **JWT authentication** — all controllers except `auth/signup` and `auth/login` are `[Authorize]`-protected; tokens are signed and validated with issuer, audience, lifetime, and signing-key checks.
- **UserId from claims, never from input** — every controller resolves the acting user via `Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!)`; no endpoint accepts a user id from the request body or query string.
- **User-scoped database queries** — every EF Core query in every controller and every agent tool filters by that resolved `UserId`; there is no cross-user query path.
- **Schedule proposal ownership** — approve/cancel operations only affect a proposal that matches both the given id *and* the caller's `UserId`; a proposal belonging to someone else is treated as not found (`404`), never revealing that it exists under a different owner (`409` is only returned once ownership is already confirmed).
- **Approval authorization** — the only code path that can write to the real `schedules` table is `ScheduleProposalsController.Approve`, which requires a valid JWT and an owned, still-pending, unexpired proposal.
- **Agent tools cannot access another user's data** — `IAgentTool.ExecuteAsync` takes `userId` as a parameter supplied by `AiAgentService` (from the authenticated request), and no tool's `ParametersSchema` exposes a user-id field the model could ever populate — Gemini has no way to request or influence whose data a tool call touches.

---

## 14. Known Limitations

- **Gemini is currently the only supported model/provider** — there's no abstraction for swapping providers; the Profile page's model selector is UI-only.
- **No per-user timezone handling** — the app has no timezone stored per user; day/week boundaries (today, this week, the Dashboard's 7-day window) use the *server's* local time zone as a stand-in. This is called out directly in the code (`DateBoundaries.cs`) as a known simplification.
- **Memory is simple relational storage, not semantic/vector memory** — facts are plain text rows matched by exact (case-insensitive) string comparison for de-duplication, not embeddings or similarity search.
- **No calendar integration** — schedules are internal to the app only; there's no import/export or sync with Google Calendar, Outlook, etc.
- **No proactive/background processing** — there's no scheduler or background job runner. Expired proposals and stale memories are only cleaned up lazily, as a side effect of the next relevant write from that same user.
- **No automated test suite** — the repository currently has no test project.
- **Single, hardcoded Gemini API key** — there's no per-user or bring-your-own-key support; one server-side key serves the whole app.
- **Conversation history persists indefinitely but only displays 24 hours at a time** — this is deliberate (see [Features](#3-features)), but worth knowing it's a display window, not a hard reset.

---

## 15. Roadmap

The following are ideas for future work — **none of this is implemented today**:

- Additional LLM providers/models, with the existing Profile page selector becoming functional
- Calendar integration (Google Calendar / Outlook sync)
- Richer schedule management (recurring schedules, drag-to-reschedule, conflict detection across proposals)
- More advanced Memory (semantic/vector search, summarization of long-term patterns)
- Improved agent planning (multi-day plans, proactive suggestions rather than purely reactive)
- Azure deployment (see [Deployment](#12-deployment))
- Per-user timezone support
- Automated test coverage

---

## 16. Reflection / Lessons Learned

This project was my hands-on introduction to building a tool-calling AI agent from scratch, rather than using an agent framework — and most of what I learned came from having to make every part of that loop work correctly myself.

The biggest shift in understanding was internalizing the actual agent loop: **User → LLM → Tool Call → Tool Execution → Tool Result → LLM → Final Response.** It's conceptually simple, but making it robust in practice meant handling things a basic chatbot integration never has to: matching Gemini's function-call/function-response wire format exactly, keeping conversation history consistent across multiple tool round-trips within one request, capping iterations so a confused model can't loop forever, and deciding what should happen when a tool call fails mid-loop.

Designing and registering tools taught me to think about an LLM the way I'd think about an untrusted API client: I write the `IAgentTool` interface, the registry that turns implementations into declarations Gemini can see, and — critically — I decide what each tool is *allowed* to touch. The model requests a tool by name and arguments; it never gets to decide whose data it's touching, because `userId` always comes from the authenticated request, never from the model's output.

Probably the most important lesson was learning **how unreliable LLM reasoning is for anything that needs to be deterministic.** Early on, a prompt instruction alone ("don't schedule something in the past") wasn't enough — the model still occasionally proposed a stale start time. That's what pushed me toward the current design: the LLM can *recommend*, but the backend *validates and enforces* independently, twice, using plain deterministic code rather than another prompt. That distinction — between an AI recommendation and an actual executable action — became the organizing principle for the whole scheduling feature, and for the human-in-the-loop approval step in general.

Beyond the agent itself, this project was also real practice with the surrounding plumbing: persistent user memory that has to be curated (not just "save the whole conversation"), backend validation and authorization boundaries that don't trust client input, Docker for a consistent local Postgres, and EF Core migrations as the schema evolved incrementally alongside new features.

I don't want to overstate what this is: it's not an autonomous, production-grade AI system, and it doesn't do proactive or unsupervised planning. It's a practical, working foundation for understanding how a tool-calling agent, a real database, and a human approval step fit together — which is exactly what I set out to learn by building it.

---

## 17. Screenshots

No screenshots are currently included in this repository beyond the KONER logo shown above (`frontend/public/Time Tracker-svg.svg`). This section is left as a placeholder for future UI screenshots of the Dashboard, Record page, and Solution chat.

---

## 18. License

This repository does not currently include a `LICENSE` file. No license is granted beyond what's implied by default copyright; add a `LICENSE` file if you intend to open-source this project.
