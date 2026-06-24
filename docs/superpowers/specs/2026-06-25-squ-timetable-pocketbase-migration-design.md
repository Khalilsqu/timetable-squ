# squ-timetable: PocketBase Migration Design

## Overview

Convert the existing Google Sheets-backed timetable SPA (`timetable-squ`) to a PocketBase-backed SPA (`squ-timetable`) with an extended schema, improved data model, and polished UI.

## Tech Stack

- **Framework:** React 19 + TypeScript 5.9
- **Build:** Vite 8 (SWC plugin)
- **UI Library:** MUI 9
- **Routing:** TanStack Router (type-safe routes, search params)
- **Data Fetching:** TanStack Query (caching, stale-time, error handling)
- **State Management:** Zustand (local UI state like filters, toggles)
- **Backend:** PocketBase 0.27 (direct browser SDK, no server proxy)
- **Deployment:** Static files served via PocketBase's `pb_public/` directory
- **Animation:** framer-motion (page transitions)
- **Charts:** ECharts (same as current)

## PocketBase Schema

### Existing collections (from user spec)
- `buildings` — name (unique)
- `halls` — name, building (relation → buildings), unique on (name, building)
- `semesters` — year, term (Fall/Spring/Summer), active (unique partial index)
- `courses` — code (unique), name, credit_hours, level (PG/UG)
- `sections` — course, semester, number (unique on course+semester+number)
- `sessions` — section, instructor, hall, day (SUN-THU), start_time, end_time, teaching_method
- `exams` — semester, course, start_time, end_time, halls (multi-rel), notes (unique on semester+course)

### Added collections
- `colleges` — name (text, unique)
- `departments` — name (text, unique), college (relation → colleges)
- `instructors` — name (text, unique), department (relation → departments, optional), college (relation → colleges, required)

### Relationships
```
colleges ──< departments ──< courses
colleges ──< instructors ──> departments (optional)
buildings ──< halls
semesters ──< sections ──< sessions
sections ──< courses
sessions ──< instructors, halls
exams ──< semesters, courses, halls
```

### Access Rules
- Public read (listRule/viewRule: `""`) for all collections
- Write access restricted to admin users (`@request.auth.person.isAdmin = true`)

## Seed Script

A Node.js script (`scripts/seed-collections.ts`) uses the PocketBase admin API with `PB_SUPERUSER_TOKEN` to:
1. Create all collections defined in the schema
2. Add all indexes (including unique composite indexes and partial index)
3. Run on demand via `npm run seed`

## Data Layer

- **PocketBase client singleton** (`src/lib/pocketbase.ts`) — initialized from `VITE_PB_URL` env var
- **Typed query hooks** (`src/lib/queries/`) — one file per domain:
  - `useColleges()`, `useDepartments(collegeId?)`, `useCourses(departmentId?)`
  - `useBuildings()`, `useHalls(buildingId?)`
  - `useSemesters()`, `useSections(semesterId)` with `expand`
  - `useSessions(semesterId?)` with expand for section→course, instructor, hall→building
  - `useExams(semesterId?)` with expand for course, halls
- PocketBase `expand` replaces client-side joins
- Server-side `filter` reduces data transfer (filter by semester at API level)

## Routing (TanStack Router)

```
/                    → EntryPage (lazy)
/student             → StudentTimetablePage (lazy)
/faculty             → InstructorTimetable (lazy)
/department          → DepartmentTimetable (lazy)
/college             → CollegeTimetable (lazy)
/common-slot         → CommonSlot (lazy)
/stats               → StatsPage (lazy)
```

All routes type-safe with TanStack Router's `@tanstack/react-router`. Search params persist filter state in URL for shareability.

## Page Architecture

All 7 existing pages preserved with same functionality:

| Page | Key Data | Features |
|------|----------|----------|
| **EntryPage** | courses, sections, sessions | Filterable table + weekly schedule toggle, instant search, pagination |
| **StudentTimetable** | sections, sessions | Section search + add, weekly schedule + exam view, conflict detection |
| **InstructorTimetable** | instructors, sessions | Multi-select instructors, weekly + exam schedule toggle |
| **DepartmentTimetable** | departments, sessions | Dept selector, filter drawer, weekly + exam schedule |
| **CollegeTimetable** | colleges, sessions | College selector, nested department schedule |
| **CommonSlot** | halls, sessions | Free-slot finder across selected halls, CSV export |
| **StatsPage** | all data aggregated | College/department charts, hall heatmap, instructor hours |

## UI Improvements

- **Skeleton loaders** on all pages during query loading (replaces spinner)
- **Instant search** on EntryPage — debounced local filter
- **Mobile-first** — bottom navigation/drawer, responsive schedule grid
- **Micro-animations** — MUI transitions + framer-motion page transitions
- **Better empty/error states** — contextual messages with action buttons
- **Persistent URL state** via TanStack Router search params
- **Dark/light theme** toggle (kept from current app)
- **Route-based code splitting** (lazy routes)
- **Preconnect** to PocketBase URL in `<head>`

## Build & Deploy

- Vite `build.outDir` set to `pocketbase/pb_public`
- Output: static HTML+JS+CSS bundle
- Served at `https://tt.earthsciences.science/` via PocketBase's built-in static file server
- No Cloudflare Pages or wrangler needed

## Repository Structure

```
squ-timetable/
├── pocketbase/              # PocketBase binary + pb_data/ + pb_public/
│   └── pb_public/           # Vite build output (gitignored)
├── scripts/
│   └── seed-collections.ts  # Collection creation script
├── src/
│   ├── lib/
│   │   ├── pocketbase.ts    # PB client singleton
│   │   └── queries/         # TanStack Query hooks
│   ├── components/          # Shared UI (layout, schedule, etc.)
│   ├── pages/               # 7 route pages
│   ├── stores/              # Zustand stores
│   └── main.tsx             # Entry + TanStack Router setup
├── .env                     # VITE_PB_URL, PB_SUPERUSER_TOKEN
├── vite.config.ts
└── package.json
```

## Migration Path

1. Create new repo at `squ-timetable`
2. Seed PocketBase collections via admin API
3. Build React SPA with TanStack Router + PocketBase SDK
4. Replace Google Sheets data layer with PocketBase query hooks
5. Port all 7 pages (keep WeeklySchedule/FinalExamSchedule components)
6. Apply UI polish (skeletons, mobile, transitions)
7. Build and copy to `pb_public/`
8. Data migration from Google Sheets (separate step)
