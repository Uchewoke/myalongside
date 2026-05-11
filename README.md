# MyAlongside

MyAlongside now includes a monorepo scaffold for the peer mentorship SaaS platform:

- `apps/web` - Next.js user-facing app
- `apps/admin` - Next.js admin dashboard
- `backend` - Express + TypeScript API
- Existing Vite prototype remains at repo root (`src/`) for incremental migration

## Quick Start

```bash
npm install
npm run dev
```

## Neon Branch Workflow

This workspace is now configured for a branch-safe Neon setup with separate environments:

- local branch: `br-withered-surf-akpjehsz`
- staging branch: `br-old-king-akf2tghv`
- prod branch: `br-sparkling-sun-akqjwwtg`

### 1) Configure branch connection strings

Copy `.env.neon.example` to `.env.neon` and set each branch URL:

- `NEON_DATABASE_URL_LOCAL`
- `NEON_DATABASE_URL_STAGING`
- `NEON_DATABASE_URL_PROD`

### 2) Switch active DATABASE_URL safely

Use one of the scripts below to update only `DATABASE_URL` in root `.env`:

- `npm run neon:use:local`
- `npm run neon:use:staging`
- `npm run neon:use:prod`

### 3) Apply schema and seed to target branch

Run these after switching:

```bash
npm run prisma:migrate:deploy
npm run prisma:seed
```

Safety tips:

- Only run `prisma:migrate:dev` against local branch.
- Use `prisma:migrate:deploy` for staging/prod.
- Keep `.env.neon` out of source control (already ignored).

Other commands:

- npm run build
- npm run preview
- npm run lint
- npm run dev:web
- npm run dev:admin
- npm run dev:backend

## Target Structure Added

The requested structure has been scaffolded with starter files for:

- Web pages (`index`, `login`, `signup`, `dashboard`, `chat`, `terms`, `privacy`, `community-guidelines`)
- Shared web components (`AuthForm`, `ChatBox`, `MentorCard`, `SeekerCard`, `Layout`, `ConsentCheckbox`)
- Admin pages (`index`, `users`, `reports`, `safety`, `analytics`)
- Backend routes, controllers, services (AI, matching, safety), middleware, models, and utilities

## Documentation Index

- [Product Overview](docs/overview.md)
- [Tech Stack and Commands](docs/tech-stack.md)
- [Project Structure](docs/project-structure.md)
- [Routing](docs/routing.md)
- [State Management](docs/state-management.md)
- [Component Reference](docs/components.md)
- [Design System](docs/design-system.md)
- [Domain Models: Communities and Mentors](docs/domain-models.md)
- [Roadmap and Environment Variables](docs/roadmap-and-env.md)

## Requirements Coverage

| Requested Area                                           | Implemented In                                         |
| -------------------------------------------------------- | ------------------------------------------------------ |
| Project overview, philosophy, design rationale           | [docs/overview.md](docs/overview.md)                   |
| Tech stack (dependency versions, roles, wiring status)   | [docs/tech-stack.md](docs/tech-stack.md)               |
| Commands (dev/build/preview/lint)                        | [docs/tech-stack.md](docs/tech-stack.md)               |
| Full annotated project structure                         | [docs/project-structure.md](docs/project-structure.md) |
| Complete routing table                                   | [docs/routing.md](docs/routing.md)                     |
| Zustand stores: schemas/actions/persistence/examples     | [docs/state-management.md](docs/state-management.md)   |
| Component reference with props/examples/behavior notes   | [docs/components.md](docs/components.md)               |
| Tag type to color mapping table                          | [docs/components.md](docs/components.md)               |
| Design system tokens/typography/layout/animation/stagger | [docs/design-system.md](docs/design-system.md)         |
| Communities schema/slug table/add flow                   | [docs/domain-models.md](docs/domain-models.md)         |
| Mentors schema and matching algorithm                    | [docs/domain-models.md](docs/domain-models.md)         |
| Backend/auth roadmap and env-variable guidance           | [docs/roadmap-and-env.md](docs/roadmap-and-env.md)     |

## Production Security Risk Register

> **Last reviewed:** 2026-04-27 — these notes reflect `next@14.2.35` and the
> current workspace dependency tree. Re-run `npm audit` after every dependency
> update and before every production release.

### Known outstanding vulnerabilities

| Package                          | Severity | CVE / Advisory                                                           | Impact summary                                     | Fix available              |
| -------------------------------- | -------- | ------------------------------------------------------------------------ | -------------------------------------------------- | -------------------------- |
| `next` (14.x)                    | **High** | [GHSA-9g9p-9gw9-jx7f](https://github.com/advisories/GHSA-9g9p-9gw9-jx7f) | Image Optimizer DoS via `remotePatterns`           | `next@16.x` (breaking)     |
| `next` (14.x)                    | **High** | [GHSA-h25m-26qc-wcjf](https://github.com/advisories/GHSA-h25m-26qc-wcjf) | HTTP request deserialization DoS with insecure RSC | `next@16.x` (breaking)     |
| `next` (14.x)                    | **High** | [GHSA-ggv3-7p47-pfv8](https://github.com/advisories/GHSA-ggv3-7p47-pfv8) | HTTP request smuggling in rewrites                 | `next@16.x` (breaking)     |
| `next` (14.x)                    | **High** | [GHSA-3x4c-7xq6-9pq8](https://github.com/advisories/GHSA-3x4c-7xq6-9pq8) | Unbounded `next/image` disk cache growth           | `next@16.x` (breaking)     |
| `next` (14.x)                    | **High** | [GHSA-q4gf-8mx6-v5v3](https://github.com/advisories/GHSA-q4gf-8mx6-v5v3) | Server Components DoS                              | `next@16.x` (breaking)     |
| `postcss` (via next)             | Moderate | [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) | XSS via unescaped `</style>` in CSS stringify      | `next@16.x` (breaking)     |
| `esbuild` (via vitest)           | Moderate | [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) | Dev server CORS bypass — dev tooling only          | `vitest@4.x` (breaking)    |
| `@hono/node-server` (via prisma) | Moderate | [GHSA-92pp-h63x-v22m](https://github.com/advisories/GHSA-92pp-h63x-v22m) | `serveStatic` middleware bypass                    | `prisma@6.19.3` (breaking) |
| `follow-redirects`               | Moderate | [GHSA-r4q5-vmmm-2653](https://github.com/advisories/GHSA-r4q5-vmmm-2653) | Auth header leak on cross-domain redirect          | `npm audit fix` (safe)     |

### Pre-production mitigation checklist

**Immediate (before any public traffic):**

- [ ] **Upgrade Next.js to 15.x or 16.x** in `apps/web` and `apps/admin`.
      Verify pages router compatibility; some rewrites and middleware APIs changed.
      Run `npm install next@latest react@latest react-dom@latest -w @peer-mentorship/web -w @peer-mentorship/admin`.
- [ ] Run `npm audit fix` (non-breaking) to resolve the `follow-redirects` CVE.
- [ ] **Disable Next.js Image Optimization remotePatterns** or set a strict allowlist
      in `next.config.js` until Next.js is upgraded. Mitigation for GHSA-9g9p-9gw9-jx7f.
- [ ] Ensure `NEXT_PUBLIC_API_BASE` is set to the production backend URL and
      never exposed to the client with a private key.

**Auth and transport:**

- [ ] Replace `authMiddleware` stub in `backend/src/middleware/auth.middleware.ts`
      with real JWT verification (e.g., `jsonwebtoken` + `jose`). The current stub
      only checks header presence — any string bypasses it.
- [ ] Enforce HTTPS in production; set `Strict-Transport-Security` header.
- [ ] Set `SameSite=Strict; Secure; HttpOnly` on all auth cookies.
- [ ] Add `helmet` to the Express app (`app.use(helmet())`) for baseline HTTP
      security headers (CSP, X-Frame-Options, etc.).

**Rate limiting and abuse prevention:**

- [ ] Replace in-memory rate limiter (`rateLimit.middleware.ts`) with a
      Redis-backed solution (e.g., `rate-limiter-flexible`) before scaling beyond
      a single instance. The current map is per-process and resets on restart.
- [ ] Add per-user and per-IP rate limits on `/api/auth/login` and
      `/api/auth/signup` to prevent credential stuffing.

**Data and privacy:**

- [ ] Tokens returned by `auth.controller.ts` are placeholder strings (`"demo-token"`).
      Issue signed JWTs with short expiry (15 min access + refresh rotation).
- [ ] Never log full message bodies or tokens. Audit `logger.ts` call sites.
- [ ] Add input length caps and schema validation (Zod is already a dependency)
      to all `req.body` reads in controllers before production.

**Build tooling (dev-only risks):**

- [ ] The `esbuild` / `vitest` vulnerability (GHSA-67mh-4wv8-2f99) only affects
      the development server — it is not in the production bundle. Mitigated by
      not exposing `vite` dev server ports externally.
- [ ] Upgrade `vitest` to v4+ when test suite compatibility has been validated.

**Monitoring:**

- [ ] Add an error monitoring solution (e.g., Sentry) to both Next.js apps and
      the backend before production launch.
- [ ] Set up `npm audit` as a CI gate: fail the pipeline on critical or high
      severity findings.

---

## Deployment

Production deploy is configured for `apps/web` on Vercel with Neon-backed envs.

### Vercel + Neon production flow

1) Prepare Neon prod URL in `.env.neon`:

- `NEON_DATABASE_URL_PROD=...`

2) Generate production env file from Neon:

```bash
npm run neon:sync:prod-env
```

3) Add env vars in Vercel project settings (Production):

- `DATABASE_URL`
- `NEXT_PUBLIC_API_BASE`
- `WEB_URL`
- `ADMIN_URL`

4) Build and deploy:

```bash
npm run vercel:build
npm run vercel:deploy
```

### Optional Vite prototype (if still used)

The root now includes `vite.config.ts` plus:

- `npm run dev:vite`
- `npm run build:vite`
- `npm run preview:vite`

Set Vite prod vars from `.env.vite.production.example`.

Typical monorepo build flow:

```bash
npm install
npm run build
```#   M y A l o n g s i d e  
 