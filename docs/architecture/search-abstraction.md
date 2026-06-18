## Goal

Keep the frontend fully decoupled from the search backend implementation.

## Current implementation (today)

- Search is implemented in Postgres via `marketplace_search_listings(...)`.
- Frontend calls the RPC and renders results.

## Abstraction contract

The frontend only depends on:

- input parameters (query + pagination)
- output DTO shape (id, slug, title, tagline, price, createdAt, etc.)

Backend implementations must preserve:

- stable ordering
- cursor semantics
- data filtering (public + active + lifecycle)

## Future migration strategy

If migrating to OpenSearch / Typesense / Meilisearch later:

- Keep the RPC name + signature unchanged.
- Implement the RPC as a thin facade:
  - write-to-search index asynchronously
  - read from search engine
  - fall back to Postgres on partial outage

No runtime change is required today.
