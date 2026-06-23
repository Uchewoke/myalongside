---
description: "Use when editing or generating code for the Next.js web app in apps/web. Covers App Router conventions, component/store usage, and API proxy style."
applyTo: "apps/web/**"
---

# Frontend Web App Instructions

## App Router Conventions
- Use the Next.js App Router (see [apps/web/src/app/](apps/web/src/app/)).
- Route files are in folders with `page.tsx` or `layout.tsx`.
- API routes live under `src/app/api/`.
- Use server components by default; add `"use client"` for interactive components.

## Component & Store Usage
- Place reusable UI in `src/components/`.
- Use Zustand for state ([src/store/](apps/web/src/store/)).
- Prefer hooks for shared logic.
- Use Tailwind CSS for styling (see `tailwind.config.ts`).

## API Proxy Style
- Call backend APIs via `/api/*` routes or helpers in `src/lib/`.
- Use fetch with relative URLs for SSR/CSR compatibility.
- Handle auth tokens via `useAuthStore` or Next.js middleware.

## Pitfalls
- Do not commit `.env*` files.
- Keep API route handlers stateless.
- Use `process.env.NEXT_PUBLIC_*` for frontend env vars.

## See Also
- [MENTOR_COPILOT_IMPLEMENTATION.md](./MENTOR_COPILOT_IMPLEMENTATION.md)
- [DATABASE_SETUP.md](./DATABASE_SETUP.md)
