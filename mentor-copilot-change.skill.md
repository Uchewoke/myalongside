---
description: "Reusable workflow for Mentor Copilot feature changes. Use when updating or adding empathy drafting, follow-up questions, resource recommendations, or boundary checker features."
---

# Mentor Copilot Change Skill

## When to Use
- Any change to Mentor Copilot backend or frontend features.
- Adding new endpoints, updating validation, or adjusting UI/UX for:
  - EmpathyDrafting
  - FollowUpQuestions
  - ResourceRecommendations
  - BoundaryLanguageChecker

## Workflow
1. Review [MENTOR_COPILOT_IMPLEMENTATION.md](./MENTOR_COPILOT_IMPLEMENTATION.md) for architecture and API details.
2. Update backend:
   - Add/modify Zod validation in `ai.controller.ts`.
   - Update or add service logic in `ai.service.ts`.
   - Register new routes in `ai.routes.ts`.
3. Update frontend:
   - Add/modify components in `apps/web/src/components/`.
   - Update API calls in `apps/web/src/app/api/ai/mentor-copilot/`.
   - Ensure state flows via props or store.
4. Test end-to-end:
   - Use dev server and test with real data.
   - Check for auth errors and validation failures.
   - Confirm UI updates and error handling.
5. Update docs if needed.

## Pitfalls
- Always validate request bodies with Zod.
- Do not break existing endpoints or UI contracts.
- Keep backend and frontend in sync.
- Never commit secrets or `.env*` files.

## References
- [MENTOR_COPILOT_IMPLEMENTATION.md](./MENTOR_COPILOT_IMPLEMENTATION.md)
