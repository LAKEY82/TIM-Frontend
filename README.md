# Theiavora Management System: Frontend

The internal project and task management UI for Theiavora. It is built with Next.js 16 (App Router), TypeScript (strict), Tailwind CSS 4, shadcn/ui (Radix), TanStack Query, React Hook Form, Zod, Recharts, date-fns and dnd-kit.

This app is **frontend only**. It has no API routes of its own and talks directly to the separate Express API configured by `NEXT_PUBLIC_API_URL`. It contains no mock or hard-coded business data; every figure, chart and list comes from the API.

---

## 1. Architecture

```
Browser ──► Next.js (static shell + client components) ──fetch──► Express API (/api/*)
                    │
                    ├─ src/proxy.ts          optimistic redirect to /login (no secrets)
                    ├─ providers/            Theme → QueryClient → Tooltip → AuthProvider
                    ├─ lib/api.ts            single HTTP client (auth, refresh, errors)
                    ├─ lib/services/*        endpoints + response normalizers
                    ├─ hooks/queries/*       TanStack Query hooks (cache, optimistic updates)
                    └─ components/*          feature UI
```

**Layering.** Components call hooks, hooks call services, and services call `api`. Components never call `fetch` and never see raw payloads.

**Adapting to the backend.** All response-shape knowledge lives in `src/lib/services/normalize.ts`, `analytics.ts` and the service files. They accept `{ data, meta }` envelopes or bare payloads, camelCase or snake_case keys, `_count` objects, `fullName` vs `name`, and similar variations. If the real API differs, fix it there. No component changes are needed.

**Authentication.**
- Sign-in uses `POST /api/auth/login` with `credentials: "include"`, so the API can set an **httpOnly** refresh or session cookie.
- If the API also returns an access token, the token is kept **in memory only**. It is never written to localStorage or sessionStorage.
- On page load, `AuthProvider` restores the session with `GET /api/auth/me`, falling back to one `POST /api/auth/refresh` if needed.
- Any request that gets a **401** triggers one shared refresh attempt and is then replayed. If the refresh fails, the client clears its state and redirects to `/login?next=…`.
- `src/proxy.ts` only reads a non-sensitive `tv_signed_in=1` hint cookie. It uses the cookie to send signed-out visitors to `/login` before the app shell renders. The cookie grants nothing. `<ProtectedRoute>` checks the real session against the API.

**Authorization.** `hasPermission()`, `can()`, `usePermission()` and `<PermissionGuard>` only control what the UI **shows**. The API remains the authority. If `user.permissions` comes back from `/auth/me`, the UI uses it as-is. Otherwise it falls back to the role matrix in `src/lib/permissions.ts`. A 403 from any endpoint renders a "Permission denied" panel.

**Server state.** TanStack Query handles all server state:
- Queries: 30 s stale time, refetch on window focus.
- Retries: network errors, 408, 429 (honouring `Retry-After`) and 5xx are retried. Other 4xx errors are not.
- Mutations: failures raise a global error toast, unless a form handles the error inline.
- Optimistic updates with rollback cover task status changes (including Kanban moves), submit-for-review, comments, and notification read state.

**Rendering.** Route files are Server Components. They `await params` (Next 16) and render client feature components. Recharts is code-split with `next/dynamic`, so analytics code loads only when a chart is shown.

**Charts.** Series colours use the validated categorical palette defined as CSS tokens in `globals.css`, with separate light and dark steps. Status colours are reserved for state and always come with an icon and a label. Every chart has a legend (for multiple series), hover tooltips, and a **table view** toggle, so no information depends on colour alone.

## 2. Route map

| Route | Purpose | UI gate (API still enforces) |
|---|---|---|
| `/login`, `/forgot-password`, `/reset-password?token=` | Public auth screens | none |
| `/dashboard` | Role-based: CEO (company), MD (operations), PM/Dept head (team), Employee | signed in |
| `/my-day` | Today / overdue / upcoming with Start, Complete, Block, Submit | signed in |
| `/tasks` (`?scope=all&status=&overdue=true`) | My tasks, or all visible tasks for managers | signed in |
| `/tasks/[id]` | Task detail: review, subtasks, comments, activity, review history, files | signed in |
| `/daily-tasks` | Daily task planner and team daily workload | `daily_tasks:manage` |
| `/projects` (`?status=`) | Cards, List, Kanban, Calendar and Timeline views | signed in |
| `/projects/[id]` + `/tasks` `/board` `/milestones` `/calendar` `/timeline` `/members` `/files` `/activity` `/analytics` | Project workspace | signed in |
| `/calendar` | Month, week and day view of tasks, deadlines and milestones | signed in |
| `/timeline` | Gantt of projects and milestones (and tasks for a focused project) | `timeline:read` |
| `/teams`, `/teams/[id]` | Departments, department detail | `teams:read` |
| `/team/[id]` | Employee profile (each section is authorized separately) | signed in |
| `/clients`, `/clients/[id]` | Clients, projects, retainers | `clients:read` |
| `/analytics` (`?tab=company\|projects\|departments\|team\|tasks`) | Analytics | `analytics:read` (company tab: `analytics:company`) |
| `/notifications` | Full notification list | signed in |
| `/settings/profile` `/notifications` `/appearance` | Personal settings | signed in |
| `/settings/company` `/users` `/departments` | Admin settings | `settings:company`, `users:manage`, `departments:manage` |

## 3. Component structure

```
src/
├── app/                    routes (thin Server Components)
│   ├── (auth)/             login, forgot-password, reset-password
│   └── (app)/              authenticated shell + all app routes
├── components/
│   ├── ui/                 shadcn/ui primitives (generated)
│   ├── layout/             AppShell, Sidebar, Header, Breadcrumbs, UserMenu, CommandSearch, MobileNav
│   ├── auth/               ProtectedRoute, PermissionGuard, LoginForm, password reset forms
│   ├── dashboard/          StatCard, ProjectHealthCard, UpcomingDeadlines, Company/Operations/Team/Employee dashboards
│   ├── tasks/              TaskCard, TaskRow/TaskTable, TaskStatusBadge, TaskPriorityBadge, TaskAssignee,
│   │                       TaskDueDate, TaskDetails, TaskReview, TaskCreateModal, TaskQuickActions, MyDayView …
│   ├── projects/           ProjectCard, ProjectTable, ProjectHeader, ProjectProgress, ProjectBoard (dnd-kit),
│   │                       ProjectOverview, project tabs (members, milestones, calendar, timeline, files, analytics)
│   ├── analytics/          chart kit, Recharts charts, lazy chart entry points, AnalyticsView
│   ├── teams/              TeamsView, DepartmentView, EmployeeProfile, WorkloadList
│   ├── comments/           TaskComments, MentionTextarea (@mentions)
│   ├── notifications/      NotificationBell, NotificationItem, NotificationsView
│   ├── clients/ settings/ daily-tasks/ schedule/
│   ├── forms/              FormField, SelectField, MultiUserSelect
│   └── shared/             ActivityTimeline, CalendarView, GanttTimeline, states, skeletons, pagination …
├── hooks/                  usePermission, query hooks
├── lib/                    api, env, permissions, constants, format, query keys, services/*
├── providers/              AppProviders, AuthProvider (useAuth)
├── types/domain.ts         the domain contract the UI is written against
└── proxy.ts                optimistic route protection
```

## 4. API integration summary

All paths are relative to `NEXT_PUBLIC_API_URL`. Payloads may be wrapped as `{ success, data, meta }` or returned bare. List endpoints should accept `page` and `pageSize` and return `meta.total`/`meta.totalPages` (or `total`/`totalPages`).

| Area | Endpoints used |
|---|---|
| Auth | `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `POST /api/auth/change-password` |
| Users | `GET /api/users?search&role&departmentId&status&page&pageSize`, `GET/PATCH /api/users/:id` (`status`, `role`, `departmentId`…), `POST /api/users`, `GET /api/users/:id/workload` |
| Departments | `GET/POST /api/departments`, `GET/PATCH/DELETE /api/departments/:id` |
| Projects | `GET /api/projects?search&status&clientId&managerId&memberId&departmentId&sortBy&sortOrder&page&pageSize`, `GET/PATCH /api/projects/:id`, `POST /api/projects`, `GET/POST /api/projects/:id/members`, `DELETE /api/projects/:id/members/:userId`, `GET/POST /api/projects/:id/files` (multipart `file`) |
| Tasks | `GET /api/tasks?projectId&milestoneId&assigneeId(=me)&reviewerId(=me)&departmentId&status(repeatable)&priority&overdue&dueFrom&dueTo&search&sortBy&sortOrder&page&pageSize`, `GET/PATCH/DELETE /api/tasks/:id`, `POST /api/tasks` (supports `parentId` for subtasks), `PATCH /api/tasks/:id/status`, `POST /api/tasks/:id/submit`, `POST /api/tasks/:id/approve`, `POST /api/tasks/:id/request-changes` (`{ feedback }`), `GET /api/tasks/:id/reviews`, `GET /api/tasks/my-day?date=` (`{ today, overdue, upcoming, inReview, blocked }`) |
| Comments | `GET/POST /api/tasks/:id/comments` (`{ body, mentionIds }`), `PATCH/DELETE /api/tasks/:id/comments/:commentId` |
| Attachments | `POST /api/tasks/:id/attachments` (multipart), `DELETE /api/tasks/:id/attachments/:attachmentId` |
| Daily tasks | `GET /api/daily-tasks?date&assigneeId`, `POST /api/daily-tasks`, `DELETE /api/daily-tasks/:id`, `GET /api/daily-tasks/workload?date=` |
| Milestones | `GET /api/milestones?projectId&from&to`, `POST /api/milestones`, `PATCH/DELETE /api/milestones/:id` |
| Notifications | `GET /api/notifications?page&pageSize&unreadOnly`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all` |
| Activity | `GET /api/activity?entityType&entityId&projectId&userId&departmentId&clientId&limit` |
| Clients | `GET/POST /api/clients`, `GET/PATCH /api/clients/:id` (detail includes `projects`, `retainers`) |
| Search | `GET /api/search?q=` → `{ projects, tasks, people, clients }` (already permission-filtered by the API) |
| Analytics | `GET /api/analytics/company?from&to`, `/api/analytics/projects/:id`, `/api/analytics/departments/:id?from&to`, `/api/analytics/tasks?from&to`, `/api/analytics/workload?departmentId&projectId&managerId` |
| Settings | `GET/PATCH /api/settings/company`, `GET/PUT /api/settings/notifications` |

The expected shape of each analytics payload is documented by its normalizer in `src/lib/services/analytics.ts` and by the types in `src/types/domain.ts`. Department analytics takes `metrics` as a keyed list, so each department can report its own figures (for example open or resolved bugs for QA, campaign tasks for Marketing) without frontend changes.

**Error handling:**
- 401 → refresh, then redirect to login.
- 403 → "Permission denied" panel.
- 404 → "Not found" panel.
- 400/422 → field errors mapped onto the form, taken from `errors: [{ path|field, message }]` or `errors: { field: message }`.
- 429 → retried after `Retry-After`, with a message.
- 5xx and network errors → retry, then an error state with a **Try again** button.

**CORS.** The API must allow the frontend origin with `Access-Control-Allow-Credentials: true`. Cookies must be `SameSite=None; Secure` if the frontend and API are on different sites.

## 5. Environment variables

| Variable | Required | Example | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | `http://localhost:5000` | API origin, **without** `/api` or a trailing slash. Inlined at build time. |
| `NEXT_PUBLIC_APP_NAME` | no | `Theiavora` | Display name. |

Copy `.env.example` to `.env.local` and adjust.

## 6. Local setup

```bash
cd frontend
npm install
cp .env.example .env.local        # NEXT_PUBLIC_API_URL=http://localhost:5000 (the backend's default port)
npm run dev                       # http://localhost:3000
```

Start the backend first (`cd ../backend && npm run dev`, after `npm run seed`). Its README lists the seeded development logins.

Sign in with a user from the backend seed data (for example the CEO, a PM or an employee) to see each role's dashboard.

### Preview without auth or a backend

```bash
npm run dev:preview               # mock API on :4000 + next dev on :3000, login skipped
```

- **Preview mode** (`NEXT_PUBLIC_AUTH_DISABLED=true`) skips login. You act as a local preview user, and a yellow banner lets you switch role ("View as") to check each dashboard and permission set.
- Preview mode is honoured **only by `next dev`**. Production builds ignore it, so it can't ship enabled.
- **`dev/mock-api.mjs`** is an in-memory stand-in for the Express API. It is seeded with the brief's people and project names, and it applies status changes, reviews, comments and so on while it runs.
- The mock API is a separate process. The app never imports it, so no mock data ends up in the bundle. It resets on restart, and file uploads are not mocked.
- To use preview mode against the **real** API instead, set `NEXT_PUBLIC_AUTH_DISABLED=true` in `.env.local` and run `npm run dev`. Set `NEXT_PUBLIC_PREVIEW_USER_ID` to a seed user's id so "my tasks" actions apply. The backend must then accept unauthenticated requests, or pages will show their 401 error states.

## 7. Build

```bash
npm run build     # production build (Turbopack)
npm run start     # serve the build on :3000
```

`NEXT_PUBLIC_API_URL` must be set **at build time**, because it is inlined into the client bundle.

## 8. Testing

```bash
npm run typecheck # tsc --noEmit
npm run lint      # ESLint (next/core-web-vitals + typescript)
npm run test      # Vitest + Testing Library (jsdom)
```

The tests (`tests/`) mock `fetch` at the network boundary and cover:
- API client: base URL, credentials, bearer header, 401 refresh-and-replay, auth failure, 422 field errors, and 403/429/500 messages.
- Login: validation, in-memory token (nothing in localStorage), role-based redirect, `?next=`, wrong credentials.
- Route protection: `ProtectedRoute` redirects or restores the session, `proxy.ts` redirects, `PermissionGuard`, the permission matrix, and task workflow actions.
- Dashboards: the CEO dashboard is driven by `/api/analytics/company`, the error state has retry, and the employee dashboard shows empty states.
- Tasks: Zod validation, payload mapping, the create modal including server field errors, status update and submit endpoints, Kanban move mapping, and optimistic update **and rollback**.
- Review: reviewer and assignee views, and the request-changes feedback flow.
- Projects: schema, internal vs external, and create-and-navigate.
- Notifications: unread count, mark read and navigate, mark all read.
- Search: Ctrl+K palette querying `/api/search`.
- Analytics normalizers.

## 9. Known limitations

- **Backend.** The matching Express + MongoDB API lives in `../backend`; it implements every endpoint listed above (checked route-by-route). If its responses ever change shape, adapt `src/lib/services/*` rather than components.
- **No real-time updates.** Notifications poll every 60 s and data refetches on window focus. There is no WebSocket or SSE yet.
- **Project boards, calendars and timelines** load up to 500 tasks in one request instead of paginating. Very large projects would need server-side windowing.
- **Kanban** moves cards between columns. It does not persist a manual order within a column, because no ordering field is assumed.
- **Theme preference** persists per device (localStorage via next-themes), not per account.
- **Avatars** are initials unless the API supplies `avatarUrl`. There is no avatar upload UI.
- **Page titles in the header** use a readable name for detail routes once their data loads. Before that, the ID segment briefly shows "…".
- **E2E tests** (Playwright) are not included. The unit and integration tests stub `fetch` and stub Recharts in the dashboard test.
