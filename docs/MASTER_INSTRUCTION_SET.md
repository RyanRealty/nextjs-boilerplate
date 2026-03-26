# Master instruction set

This doc is the **single reference for product and technical intent** for the Ryan Realty platform.

- **What exists today:** See [FEATURES.md](./FEATURES.md).
- **URL and routing:** See [URL_ARCHITECTURE.md](./URL_ARCHITECTURE.md).
- **Sync and data:** See [SYNC.md](./SYNC.md) and [SPARK_SUPABASE_REPLICATION_SPEC.md](./SPARK_SUPABASE_REPLICATION_SPEC.md).
- **Audit and quality:** Follow current repository guardrails in `CLAUDE.md` and `.cursor/rules/`.

Canonical listing detail URL is `/listing/[listingKey]`; `/listings/[listingKey]` redirects. Team/broker profiles are canonical at `/team` and `/team/[slug]`; `/agents` redirects.
