# AI Time Management Agent

A time tracking application: record how you spend your time, review it, and see basic
statistics. AI-driven analysis of time usage is planned for a later phase — this repo currently
covers the core CRUD + stats functionality.

## Stack

- **Frontend**: React + TypeScript (Vite)
- **Backend**: C# / ASP.NET Core Web API (.NET 10)
- **Database**: PostgreSQL
- **ORM**: Entity Framework Core (Npgsql provider)

## Project layout

```
backend/TimeTracker.Api/   ASP.NET Core Web API (Controllers, Models, Dtos, Data, Migrations)
frontend/                  React + TypeScript app (Vite)
docker-compose.yml         Postgres for local development
```

## Prerequisites

- .NET SDK 10+
- Node.js 20+
- Docker Desktop (for the bundled Postgres container) — or your own PostgreSQL instance

## Running locally

### 1. Database

```
docker compose up -d
```

This starts Postgres on `localhost:5432` with database `timetracker` / user `timetracker` /
password `timetracker` (see `docker-compose.yml`). If you're using your own Postgres instance
instead, update the connection string in
`backend/TimeTracker.Api/appsettings.json` (`ConnectionStrings:Default`).

### 2. Backend

```
cd backend/TimeTracker.Api
dotnet ef database update   # applies migrations, creates the schema
dotnet run
```

The API listens on `https://localhost:7267` (and `http://localhost:5224`). Swagger UI is
available at `/swagger` in development.

The frontend's `.env` expects the **HTTPS** port (7267), which `dotnet run` uses by default
(the `https` launch profile). If running from Visual Studio, make sure the `https` profile is
selected in the run dropdown, not `http` — otherwise only port 5224 comes up and the frontend
will fail to connect.

### 3. Frontend

```
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`. It reads the API base URL from
`VITE_API_BASE_URL` (see `frontend/.env`, copied from `.env.example`) — defaults to
`https://localhost:7267/api`.

## API overview

Base path: `/api/time-records`

| Method | Path      | Description                                                |
|--------|-----------|-------------------------------------------------------------|
| GET    | `/`       | List records (optional `from`, `to`, `category` filters)   |
| GET    | `/{id}`   | Get a single record                                         |
| POST   | `/`       | Create a record                                              |
| PUT    | `/{id}`   | Update a record                                              |
| DELETE | `/{id}`   | Delete a record                                              |
| GET    | `/stats`  | Total hours + breakdown by category (optional `from`, `to`) |

## Data model

`time_records` table: `id`, `start_time`, `end_time`, `category`, `notes`, `created_at`,
`updated_at`, with a check constraint that `end_time > start_time`.
