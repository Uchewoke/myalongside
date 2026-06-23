---
description: "Use when editing or generating backend API code in backend/. Covers controller/service/route boundaries, validation, and auth middleware."
applyTo: "backend/**"
---

# Backend API Instructions

## Structure
- Route registration: `src/routes/`
- Controllers: `src/controllers/` (HTTP layer only)
- Services: `src/services/` (business logic)
- Shared helpers: `src/lib/`

## Validation
- Use Zod schemas for all request validation.
- Validate both body and query params.
- Return 400 with error details on validation failure.

## Auth Middleware
- Use `requireAuth` for all protected routes.
- Use `requireAdminAccess` for admin-only endpoints.
- Attach user info to `req.auth`.

## Prisma
- Use the shared `prisma` client from `src/lib/prisma.ts`.
- Regenerate Prisma types after schema changes.

## Pitfalls
- Never commit secrets or `.env*` files.
- Stripe webhook must use raw body (see `src/index.ts`).
- Keep business logic out of controllers/routes.

## See Also
- [DATABASE_SETUP.md](./DATABASE_SETUP.md)
