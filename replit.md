# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## TrustMRR Clone (artifacts/trustmrr-clone)
React + Vite + Tailwind v4 site replicating trustmrr.com using mock data.
- Default DARK theme with light/dark toggle (footer); persisted to localStorage `trustmrr-theme`.
- Inconsolata monospace font; semantic Tailwind tokens for theme support.
- Layout: compact sponsor cards in left/right rails (mix of dark + colored backgrounds).
- Promo strip: "First 250 Founders/Investors get a FREE listing + FREE explore for life".
- Home page sections: Recently listed, Best deals, Leaderboard (25 rows), LiveGlobe (CSS sphere with 15 clickable avatar markers + DataFast overlay + visit feed), WhatsHappening (3-column masonry feed), Stats KPIs, BottomSection ($1 or $1,000,000 character + Browse-by-category pill grid + 4-column footer).
- Avatar profile dialog opens on globe-marker click (referrer, OS, conversion likelihood gradient, est. value).
- All mock data in `src/lib/mockData.ts`; no backend.
