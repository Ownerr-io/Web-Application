# Bundle — heavy imports & lazy-load candidates

## After optimization (2026-05)

| Chunk                               | Size (min) | Gzip   | Notes                             |
| ----------------------------------- | ---------- | ------ | --------------------------------- |
| **index** (main)                    | 1,693 KB   | 470 KB | Was **3,072 KB** / 811 KB gzip    |
| valuation                           | 391 KB     | 55 KB  | Route lazy                        |
| valuationExportPdf                  | 427 KB     | 139 KB | Dynamic import on PDF export      |
| generateCategoricalChart (recharts) | 382 KB     | 105 KB | Pulled with stats / charts        |
| acquire                             | 69 KB      | 18 KB  | Route lazy                        |
| startup-detail                      | 52 KB      | 14 KB  | Route lazy                        |
| stats                               | 38 KB      | 11 KB  | Route lazy                        |
| html2canvas                         | 201 KB     | 47 KB  | Still split; loads with PDF stack |
| index.es (jspdf)                    | 159 KB     | 53 KB  | PDF chunk dependency              |

**Main bundle reduction: ~45% minified (~42% gzip).**

## Before optimization

Main chunk ~**3.07 MB** minified (~811 KB gzip). Secondary chunks: **html2canvas** (~201 KB), **index.es** (jspdf stack ~159 KB), **purify.es** (~25 KB).

## Heavy dependencies (by impact)

| Package                          | Pulled from                                           | Lazy-load candidate?                                                                                       |
| -------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **jspdf** + **jspdf-autotable**  | `lib/valuationExport.ts` → `ValuationExportActions`   | **Yes** — dynamic `import()` on “Download PDF” only                                                        |
| **html2canvas** (transitive)     | Bundled with PDF/export path                          | **Yes** — same as PDF flow                                                                                 |
| **recharts**                     | `StatsDashboard`, `MarketplaceTrendChart`, `ui/chart` | **Yes** — route-level `React.lazy` for `/stats`, marketplace stats widgets                                 |
| **@lottiefiles/dotlottie-react** | `ValuationLottieAnimation`                            | **Yes** — lazy inside valuation route / below fold                                                         |
| **framer-motion**                | Many marketing + valuation + founder-os pages         | **Partial** — lazy-load route modules (`/valuation`, `/game`, founder-os dialog) rather than per-component |
| **@tanstack/react-query**        | `App.tsx` root                                        | No — core shell                                                                                            |

## Route-level lazy candidates (highest ROI)

1. `/valuation` — valuation stack + Lottie + PDF export
2. `/stats` and `/marketplace/stats` — `StatsDashboard` + recharts
3. `/admin/founder-stats` — admin-only
4. `/game` — framer-motion mini-game
5. Founder OS flow dialog — `FounderOsFlowDialog` + `FounderOsExperience`
6. Acquire page — large page + `MockAcquireBidPanel`

## Not recommended to lazy-load yet

- Auth providers, `DashboardLayout`, product shells (needed immediately after login)
- `@/components/ui/*` (wide surface; split only if measuring duplicate chunks)

## Dead code removed this pass

- `MoreStartupsForSaleSection` implementation (~150 lines) — placeholder `return null` kept for layout hook
- Unused `randInt` in `statsDerivedData.ts`
- `workspaceSettingsPath` deprecated alias
