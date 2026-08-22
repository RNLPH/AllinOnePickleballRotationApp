# RallyStack

Court session manager for racket sports. Manage player queues, court rotation, standings, and match history for pickleball, badminton, tennis, padel, and more.

## Features

- **9 Game Modes** — Open, Ladder, Extended Ladder, King of Court, Round Robin, Swiss System, Random Draw, Fixed Teams, Challenge Mode
- **Singles & Doubles** — each court can independently be 1v1 or 2v2
- **ELO Rating** — DUPR-style skill rating that updates after every match
- **Auto-Rotation** — balanced team pairing with partner/opponent history
- **Priority Queue** — mark players as priority/not-priority for queue ordering
- **Preview Next Match** — see who's up next on each court before starting
- **Multi-Club** — each club gets isolated data with Supabase auth
- **Invite Links** — share a link for others to join your club
- **Live Board** — public URL for TV/tablet display at the venue
- **Self Check-in** — players add themselves via a public link
- **Challenge Mode** — players challenge others via public link (singles & doubles)
- **Dark Mode** — toggle light/dark theme
- **Multi-language** — 9 languages (EN, DE, ES, FR, PT, JA, ZH, KO, FIL)
- **CSV Bulk Import** — upload a roster to add many players at once
- **QR Codes** — scannable/printable QR for check-in and live board
- **Push Notifications** — browser alerts when it's your turn
- **Custom Club URLs** — set a slug for short, memorable public links
- **Swiss Auto-Pairing** — pairs players by similar win rate
- **Round Robin Pairing** — picks unplayed matchups first
- **Player Dashboard** — public stats page per player (ELO, form, match history)
- **Rest Timer** — configurable cooldown after playing (prevents court-hogging)
- **Court Wait Time** — estimated wait shown on Live Board for queued players
- **Delete Club** — remove a club and all its data (owner only, triple confirm)
- **Clear Court** — return all players from a court to queue with one click
- **All-Time Leaderboard** — aggregated standings across all sessions
- **Match Scores** — optional score entry (e.g. 11-7) after each game, shown in history
- **PWA** — installable on phone, works offline, auto-updates

## Tech Stack

- **Frontend** — React 19, Vite 8, Tailwind CSS 4
- **Database** — Supabase (PostgreSQL)
- **Auth** — Supabase Auth (email/password)
- **Drag & Drop** — @dnd-kit
- **Hosting** — Vercel
- **PWA** — vite-plugin-pwa

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A Supabase account (free tier works)
- A Vercel account (for deployment)

### 1. Clone the repository

```bash
git clone https://github.com/RNLPH/AllinOnePickleballRotationApp.git
cd AllinOnePickleballRotationApp
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to the **SQL Editor** and run the following:

```sql
-- Tables
create table clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create table directory (
  id text primary key,
  name text not null,
  club_id uuid references clubs(id) on delete cascade,
  data jsonb not null default '{}'
);

create table players (
  id text primary key,
  name text not null,
  club_id uuid references clubs(id) on delete cascade,
  data jsonb not null default '{}'
);

create table matches (
  id bigserial primary key,
  session_id integer not null,
  date bigint not null,
  club_id uuid references clubs(id) on delete cascade,
  data jsonb not null default '{}'
);

create table attendance (
  id text primary key,
  player_id text not null,
  session_id integer not null,
  club_id uuid references clubs(id) on delete cascade,
  data jsonb not null default '{}'
);

create table standings_history (
  id text primary key,
  session_id integer not null,
  club_id uuid references clubs(id) on delete cascade,
  data jsonb not null default '{}'
);

create table courts (
  club_id uuid primary key references clubs(id) on delete cascade,
  data jsonb not null default '[]'
);

-- Enable RLS on all tables
alter table clubs enable row level security;
alter table directory enable row level security;
alter table players enable row level security;
alter table matches enable row level security;
alter table attendance enable row level security;
alter table standings_history enable row level security;
alter table courts enable row level security;

-- RLS Policies: club owner access
create policy "Owner manages club" on clubs for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "Club data access" on directory for all
  using (club_id in (select id from clubs where owner_id = auth.uid()))
  with check (club_id in (select id from clubs where owner_id = auth.uid()));

create policy "Club data access" on players for all
  using (club_id in (select id from clubs where owner_id = auth.uid()))
  with check (club_id in (select id from clubs where owner_id = auth.uid()));

create policy "Club data access" on matches for all
  using (club_id in (select id from clubs where owner_id = auth.uid()))
  with check (club_id in (select id from clubs where owner_id = auth.uid()));

create policy "Club data access" on attendance for all
  using (club_id in (select id from clubs where owner_id = auth.uid()))
  with check (club_id in (select id from clubs where owner_id = auth.uid()));

create policy "Club data access" on standings_history for all
  using (club_id in (select id from clubs where owner_id = auth.uid()))
  with check (club_id in (select id from clubs where owner_id = auth.uid()));

create policy "Club courts access" on courts for all
  using (club_id in (select id from clubs where owner_id = auth.uid()))
  with check (club_id in (select id from clubs where owner_id = auth.uid()));

-- Public read policies (for live board and self check-in)
create policy "Public read clubs" on clubs for select using (true);
create policy "Public read players" on players for select using (true);
create policy "Public read matches" on matches for select using (true);
create policy "Public read courts" on courts for select using (true);
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these from Supabase → Settings → API.

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:5173

### 5. Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → Import your repo
3. Add environment variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`)
4. Deploy — Vercel auto-detects Vite and builds

### 6. Configure Supabase Auth

1. Go to Supabase → Authentication → URL Configuration
2. Set **Site URL** to your Vercel URL (e.g. `https://your-app.vercel.app`)
3. Add `http://localhost:5173` to **Redirect URLs** for local development

## Usage

### For Club Leaders (Operators)

1. Sign up → create your club
2. Choose a game mode (Open, Ladder, Extended Ladder, King of Court, Round Robin, Swiss, Random Draw, Fixed Teams, or Challenge)
3. Add players to the queue
4. Create courts (set format: doubles/singles)
5. Click "Start Game" to auto-fill courts
6. Record results with "Team A Wins" / "Team B Wins"
7. Share the Live Board link (🔗) for players to watch
8. Share the Check-in link (📋) for self check-in
9. Invite other operators via Invite Link

### For Players

- Open the **Live Board** link to see active courts and queue position
- Open the **Check-in** link to add yourself to the queue
- No login required for players

### Public URLs

- Live Board: `https://your-app.vercel.app/live/CLUB_ID`
- Self Check-in: `https://your-app.vercel.app/checkin/CLUB_ID`

## Project Structure

```
src/
├── App.jsx                    — Main app (auth wrapper + AppMain)
├── constants.js               — Mode configs, tier limits, storage keys
├── main.jsx                   — Entry point with routing
├── components/
│   ├── auth/                  — Login, signup, club setup screens
│   ├── dashboard/             — SessionControls, PlayerQueue, PlayerRow, CourtCard
│   ├── dnd/                   — Drag-and-drop components
│   ├── modals/                — All modal dialogs
│   ├── tabs/                  — Standings, Attendance, History tabs
│   ├── ui/                    — Reusable UI (PlayerAvatar)
│   ├── LiveBoard.jsx          — Operator fullscreen live display
│   ├── PublicLiveBoard.jsx    — Public live board (no auth)
│   └── PublicCheckin.jsx      — Public self check-in page
├── db/
│   ├── supabase.js            — Supabase client
│   ├── playerService.js       — Queue player CRUD
│   ├── directoryService.js    — Permanent player registry
│   ├── matchService.js        — Match history
│   ├── attendanceService.js   — Attendance records
│   └── standingsHistoryService.js — Historical standings
└── utils/
    ├── playerUtils.js         — Sort, shuffle, time formatting
    ├── teamUtils.js           — Balanced teams, rotation scoring
    ├── csvUtils.js            — CSV export
    ├── avatarUtils.js         — Image resize for avatars
    └── eloUtils.js            — ELO rating calculations
```

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # Run linter (oxlint)
```

## License

Private project.
