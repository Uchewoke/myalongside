# Next.js Runtime Audit Blocker

Date: 2026-06-09
Status: Blocked on stable Next.js line for PostCSS advisory

## Summary

The web workspace runtime audit (`npm audit --workspace=apps/web --omit=dev`) reports a PostCSS advisory on the stable Next.js line currently used on `main`.

Advisory:
- `GHSA-qx2v-qp2m-jg93` (PostCSS `<8.5.10`)

## Stable Branch State (`main`)

- Web manifest target in `apps/web/package.json`: `next: 15.5.18`, `eslint-config-next: 15.5.18`
- Runtime audit result: advisory present (`postcss <8.5.10`) via Next transitive dependency.

## Canary Validation State

Canary was validated on a dedicated branch:
- Branch: `next-canary-validation`
- Commit: `e9350bf`
- Web dependencies on validation branch: `next@16.3.0-canary.46`, `eslint-config-next@16.3.0-canary.46`
- Runtime audit result on canary: `found 0 vulnerabilities`

## Decision

- Keep `main` on stable Next.js.
- Track this as blocked until a stable Next.js release includes the PostCSS fix.
- Use `next-canary-validation` branch only for short-term validation of the fix path.

## Follow-up

When a stable Next.js release includes patched PostCSS:
1. Update `apps/web/package.json` to that stable Next version.
2. Run install in workspace (`npm install --workspace=apps/web --include=dev`).
3. Re-run runtime audit (`npm audit --workspace=apps/web --omit=dev`).
4. Remove this blocker note once runtime audit is clean on stable.
