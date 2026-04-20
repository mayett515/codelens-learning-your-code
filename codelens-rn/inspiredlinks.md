# Inspired Links

Reference links shared during architecture and TypeScript discussions.
These are inspiration and review inputs, not hard source-of-truth specs for this repo.

## TypeScript
- TypeScript best practices (German): <https://hupp.tech/de/blog/typescript/best-practices-fur-die-verwendung-von-typescript-in-unternehmensanwendungen/>
  Why it matters for CodeLens: Reinforces strict typing at boundaries, avoiding unsafe shortcuts that later break offline flows. Useful for keeping feature modules clean as complexity grows.
  Action we adopted: Enforced strict TypeScript + boundary safety (`exactOptionalPropertyTypes`, branded IDs, Zod codecs, minimal `any` policy in feature data code).
- TypeScript design patterns guide: <https://medium.com/@muhmdshanoob/mastering-typescript-design-patterns-a-complete-guide-to-building-scalable-applications-0443759c46aa>
  Why it matters for CodeLens: Helps choose maintainable patterns for orchestration-heavy areas (learning sync, backup/restore, send flows). Good reference for scaling architecture without over-engineering.
  Action we adopted: Moved orchestration into use-cases/hooks (`features/*/application`, shared `send-flow`) and kept route screens thin.

## React Native
- Callstack agent skill (React Native best practices): <https://github.com/callstackincubator/agent-skills/tree/main/skills/react-native-best-practices>
  Why it matters for CodeLens: Aligns with performance and lifecycle-safe patterns for RN screens, lists, and state usage. Useful to keep chat and learning screens responsive on mobile devices.
  Action we adopted: Centralized reusable flows in hooks, kept list/query patterns stable, and added focused Vitest coverage for critical async paths.
- Clean Architecture in React Native (movie app example): <https://dev.to/rubemfsv/building-a-movie-app-with-clean-architecture-concepts-in-react-native-6md>
  Why it matters for CodeLens: Practical example of clean architecture layering in RN, matching our domain/application/data/ui split. Validates our move to feature co-location with explicit boundaries.
  Action we adopted: Formalized core-vs-feature boundaries (`src/` core infra + `src/features/*` modules) and transaction-safe application-layer workflows.

## Architecture Style / Code Reading
- Reading code: BlueSky article: <https://alexkondov.com/reading-code-bluesky/>
  Why it matters for CodeLens: Encourages architectural reading habits focused on module seams and dependency direction, not just syntax. Useful when reviewing PRs for boundary leaks.
  Action we adopted: Added explicit architecture contracts/checklists so reviews target dependency direction, barrel leaks, query-key consistency, and error-handling behavior.
- BlueSky social app repo: <https://github.com/bluesky-social/social-app>
  Why it matters for CodeLens: Inspires feature-oriented organization and clear public module surfaces. Supports our barrel-discipline approach to reduce deep import coupling.
  Action we adopted: Implemented barrel discipline (`@/src/features/learning` public API), query key factories, and co-located feature internals with relative imports.

## How we use these
- Use these links as pattern inspiration.
- Final decisions are documented in:
  - `whatwe_agreedonthearchitecture.md` (LLM contract)
  - `whatwe_agreedonthearchitecture_humans.md` (human guide)
  - `ARCHITECTURE.md` (repo architecture details)
