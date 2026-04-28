# Ownerr Web App

Ownerr is a frontend-first startup acquisition marketplace simulation at `artifacts/ownerr-web-app`.  
It models discovery, trust evaluation, interest threads, mock bidding, and role-based buyer/founder dashboards.

## What It Is

- A React + TypeScript application for marketplace-style startup acquisition workflows
- Mock-authenticated and role-aware (`buyer`, `founder`)
- Fully local persistence using IndexedDB + LocalStorage
- No real backend in active user flows (service layer is mock/domain-driven)

## What It Does

- Public discovery: browse and inspect startup listings
- Buyer operations: filter/search, express interest, place bids, track interests and bids
- Founder operations: monitor listings, respond to inbox threads, adjust verification state
- Trust model: computed trust score/label from verification states
- Deal simulation: stage progression across a mock bidding pipeline

---

## 1) System Architecture (Full)
Shows the implemented layers and end-to-end data movement.

```mermaid
flowchart TD
    subgraph UI["UI Layer (Pages + Components)"]
        P1[Public Pages]
        P2[Buyer Pages]
        P3[Seller Pages]
        C1[Shared Components]
        L1[Layouts]
    end

    subgraph STATE["State / App Orchestration"]
        A1[App Route Guards]
        A2[MockSessionContext]
        A3[MockBiddingContext]
        A4[AddStartupContext]
        A5[TanStack Query Client]
    end

    subgraph SVC["Mock Service Layer"]
        S1[mockAuthService]
        S2[mockMarketplaceService]
        S3[mockBiddingPipeline]
        S4[mockData seed models]
    end

    subgraph PERSIST["Persistence Layer"]
        D1[(IndexedDB auth-users)]
        D2[(IndexedDB marketplace-listings)]
        D3[(IndexedDB marketplace-interest)]
        D4[(IndexedDB mock-listing-bids)]
        D5[(IndexedDB user-startups)]
        D6[(IndexedDB claim-spots)]
        LS1[(LocalStorage ownerr-mock-session-user)]
        LS2[(LocalStorage ownerr-acquire-filters-v1)]
    end

    UI --> STATE
    STATE --> SVC
    SVC --> PERSIST
    PERSIST --> SVC
    SVC --> STATE
    STATE --> UI
```

---

## 2) Component Architecture
High-level relationships between pages, layouts, and shared/domain components.

```mermaid
graph TD
    APP[App.tsx]

    subgraph Pages
        ACQ[Acquire]
        SD[StartupDetail]
        BA[Buyer Dashboard Pages]
        SA[Seller Dashboard Pages]
        AU[Auth Dialog Entry]
    end

    subgraph Layouts
        LO[Layout]
        DL[DashboardLayout]
        SB[DashboardSidebar]
    end

    subgraph Shared["Shared / Domain Components"]
        CARD[AcquireListingCard]
        BID[MockAcquireBidPanel]
        AUTH[AuthDialog]
        ADD[AddStartupDialog]
        FCS[FounderControlsSection]
        UIK[UI primitives / cards / dialogs / charts]
    end

    APP --> LO
    APP --> DL
    DL --> SB

    LO --> ACQ
    LO --> SD
    LO --> AU

    DL --> BA
    DL --> SA

    ACQ --> CARD
    ACQ --> BID
    SD --> BID
    SD --> FCS

    APP --> AUTH
    APP --> ADD
    Shared --> UIK
```

---

## 3) Routing Flow
Separates public vs protected routes and captures implemented redirect behavior.

```mermaid
flowchart TD
    START[Route request] --> HASUSER{currentUser exists?}

    HASUSER -->|No| PUBLICCHECK{Public route?}
    HASUSER -->|Yes| ROUTETYPE{Requested route type}

    PUBLICCHECK -->|Yes| PUBLICOK[Render PublicRoute page]
    PUBLICCHECK -->|No protected path| REDIRROOT[Redirect to /]

    ROUTETYPE -->|Public route| REDIRDASH{Role}
    REDIRDASH -->|buyer| REDIRBUYER[Redirect to /buyer]
    REDIRDASH -->|founder| REDIRSELLER[Redirect to /seller]

    ROUTETYPE -->|Buyer protected| BUYERROLE{Role is buyer?}
    ROUTETYPE -->|Seller protected| SELLERROLE{Role is founder?}

    BUYERROLE -->|Yes| BUYEROK[Render buyer route]
    BUYERROLE -->|No| ROLEBACK1[Redirect to /seller]

    SELLERROLE -->|Yes| SELLEROK[Render seller route]
    SELLERROLE -->|No| ROLEBACK2[Redirect to /buyer]
```

Implemented route groups:
- Public: `/`, `/feed`, `/stats`, `/cofounders`, `/claim`, `/startup/:slug`, `/founder/:handle`, `/acquire`
- Buyer: `/buyer`, `/buyer/interests`, `/buyer/acquire`, `/buyer/bids`, `/buyer/profile`
- Seller: `/seller`, `/seller/listings`, `/seller/inbox`, `/seller/verification`, `/seller/profile`

---

## 4) Authentication Flow (Mock)
Shows guest entry, auth dialog behavior, persistence, and guarded routing effects.

```mermaid
sequenceDiagram
    participant G as Guest
    participant UI as AuthDialog/SessionContext
    participant AS as mockAuthService
    participant DB as IndexedDB(auth-users)
    participant LS as LocalStorage(session key)
    participant RT as Route guards

    G->>UI: Open login/register dialog
    UI->>AS: loginAuthUser() or registerAuthUser()
    AS->>DB: read/write auth-users
    DB-->>AS: user record
    AS-->>UI: authenticated user (role)
    UI->>LS: set ownerr-mock-session-user
    UI->>RT: update currentUser
    RT-->>G: redirect to /buyer or /seller
```

Notes:
- There are no standalone `/login` or `/register` routes; auth is modal-based.
- On app load, session is rehydrated from LocalStorage and user record is loaded from IndexedDB.

---

## 5) Buyer User Flow
Implemented buyer path from exploration to conversation/bid tracking.

```mermaid
flowchart LR
    A[Enter marketplace acquire view] --> B[Filter / sort / search listings]
    B --> C[Open startup detail]
    C --> D{Action}
    D -->|Express Interest| E[Create/update interest thread]
    D -->|Place Bid| F[Submit bid in mock bidding panel]
    E --> G[Track in /buyer/interests]
    F --> H[Track in /buyer/bids]
    G --> I[Conversation progression]
    H --> I
```

---

## 6) Seller (Founder) User Flow
Implemented founder journey across dashboard, listing control, verification, and thread handling.

```mermaid
flowchart TD
    A[Login as founder] --> B[Redirect to /seller dashboard]
    B --> C[View listings / inbox / verification pages]
    C --> D[Open owned listing detail]
    D --> E[Founder controls enabled]
    E --> F[Adjust verification status]
    E --> G[Run mock domain verification]
    E --> H[Review incoming interest threads]
    H --> I[Reply and update thread stage]
```

Note: a strict `Draft -> Publish` state machine is not fully implemented as a dedicated listing status model.

---

## 7) Listing Lifecycle Flow
Represents lifecycle states that are actually implemented today.

```mermaid
flowchart TD
    L0[Seeded/created listing record] --> L1[Verification statuses tracked]
    L1 --> L2[Visible in acquire/discovery lists]
    L2 --> L3[Buyer interactions: interest and/or bids]
    L3 --> L4[Interest thread stages: interested -> contacted -> negotiating -> closed]
    L3 --> L5[Bidding pipeline: BID_PLACED -> ... -> PAYMENT_RELEASED]
```

Notes:
- `forSale` controls market behavior; no dedicated publish-state enum.
- Interest stages and bidding pipeline are separate but related lifecycle tracks.

---

## 8) Verification Flow
Covers revenue, domain, and traffic verification logic with implemented transitions.

```mermaid
flowchart TD
    START[Verification update request] --> TYPE{Verification type}

    TYPE -->|Revenue| REV[updateMarketplaceVerification revenue]
    REV --> REVCHECK{Has >=3 positive revenue points and non-zero MRR?}
    REVCHECK -->|Yes| REVKEEP[Allow requested status]
    REVCHECK -->|No| REVRESET[Normalize to unverified]

    TYPE -->|Domain| DOMRUN[runMockDomainVerification]
    DOMRUN --> D1[Set pending]
    D1 --> D2[Mock async check]
    D2 --> D3{Random outcome}
    D3 -->|success| D4[verified]
    D3 -->|fail| D5[failed]

    TYPE -->|Traffic| TRF[updateMarketplaceVerification traffic]
    TRF --> T1{Provider Google Analytics and verified?}
    T1 -->|Yes| T2[Regenerate mock traffic history]
    T1 -->|No| T3[Keep manual/selected provider state]
```

---

## 9) Data Flow Diagram
Shows how each core entity moves through UI, services, persistence, and back.

```mermaid
flowchart LR
    UI[UI Actions] --> SVC[Service/Context methods]

    SVC --> LST[(marketplace-listings)]
    SVC --> BID[(mock-listing-bids)]
    SVC --> INT[(marketplace-interest)]
    SVC --> AUTH[(auth-users)]
    SVC --> SES[(LocalStorage session/filter keys)]

    LST --> SVC
    BID --> SVC
    INT --> SVC
    AUTH --> SVC
    SES --> SVC

    SVC --> VIEW[Derived view models]
    VIEW --> UI
```

Entity mapping:
- Listings: `MarketplaceListing` via `mockMarketplaceService`
- Bids: `MockListingBidRecord` via `MockBiddingContext`
- Interest threads/messages: `MarketplaceInterestRecord`
- Auth/session: auth user records + session user id key

---

## 10) Trust Score Computation
Exact implemented weighting logic used to derive `trustScore` and labels.

```mermaid
flowchart TD
    A[Start score = 0] --> B{revenueVerified == verified?}
    B -->|Yes| B1[+40]
    B -->|No| C
    B1 --> C{domainVerified == verified?}
    C -->|Yes| C1[+30]
    C -->|No| D
    C1 --> D{trafficVerified == verified?}
    D -->|Yes| D1[+30]
    D -->|No| E
    D1 --> E[Clamp score 0..100]
    E --> F{Label}
    F -->|>=70| L1[High Trust]
    F -->|>=40| L2[Medium Trust]
    F -->|<40| L3[Low Trust]
```

---

## 11) Dashboard Flows
Shows current buyer and seller dashboard navigation and intent.

```mermaid
flowchart LR
    subgraph BuyerDashboard
        B0[/buyer/] --> B1[/buyer/interests/]
        B0 --> B2[/buyer/bids/]
        B0 --> B3[/buyer/profile/]
        B0 --> B4[/buyer/acquire/]
    end

    subgraph SellerDashboard
        S0[/seller/] --> S1[/seller/listings/]
        S0 --> S2[/seller/inbox/]
        S0 --> S3[/seller/verification/]
        S0 --> S4[/seller/profile/]
    end
```

---

## 12) Error / Edge Flow (Lightweight)
Summarizes implemented guardrails and common edge conditions.

```mermaid
flowchart TD
    A[User triggers protected action/route] --> B{Authenticated?}
    B -->|No| C[Open auth dialog or redirect to /]
    B -->|Yes| D{Correct role?}
    D -->|No| E[Redirect to role dashboard]
    D -->|Yes| F[Continue action]

    F --> G{Create new interest thread}
    G --> H{Already 3 threads for buyer+listing?}
    H -->|Yes| I[Return error: 3-thread limit reached]
    H -->|No| J[Create/update thread]
```

---

## Key Features (Concise)

- Public startup discovery and listing detail experiences
- Modal-based mock authentication with role-aware redirects
- Buyer and seller dashboard ecosystems with route guards
- Mock verification and trust scoring engine
- Interest thread lifecycle and mock bidding/deal pipeline
- Browser-local persistence for realistic state continuity

---

## Tech Stack

- Frontend: React 19, TypeScript, Wouter, TanStack Query, Tailwind CSS v4
- UI: Radix-based primitives, Lucide icons, Framer Motion, Recharts
- Data/persistence: IndexedDB (`idb`) + LocalStorage
- Tooling: Vite, TypeScript (`tsc`), static deployment config via Vercel

---

## Project Structure

`artifacts/ownerr-web-app`

- `src/App.tsx` - providers, routing, public/protected wrappers
- `src/pages/` - public, buyer, seller page modules
- `src/components/` - shared and domain components
- `src/context/` - session, bidding, and listing-related providers
- `src/lib/` - mock services, persistence adapters, domain models, utilities

---

## Run Locally

From `artifacts/ownerr-web-app`:

```bash
npm install
npm run dev
```

Additional scripts:

```bash
npm run build
npm run serve
npm run typecheck
```

---

## Constraints

- Frontend-only mock implementation for core flows
- No server-backed multi-user synchronization
- Verification and closing pipeline behavior are simulated
- No dedicated backend ACL enforcement (client-side route/component guards)

---

## Optional: Export Diagrams for Sharing

For external docs/slides, export Mermaid blocks to PNG/SVG using Mermaid CLI:

```bash
npx @mermaid-js/mermaid-cli -i diagram.mmd -o diagram.png
```
