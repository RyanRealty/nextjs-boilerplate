# Delta sync — status and how to see it

The **delta ingest sync** fetches listings changed since the last successful run and updates your database. Its status appears on the **Sync** page (`/admin/sync`).

---

## Will it run non-stop? What if it fails?

- **How it runs:** The ingest does **not** run as one long process. A scheduler calls `GET /api/cron/sync-delta` on a fixed cadence. As long as that scheduler is active and your app is deployed, delta sync keeps running in short repeatable passes.
- **How you know if it fails:**
  1. **Sync page (`/admin/sync`)** — **Last run** shows the time of the last *completed* delta run. If the ingest has stopped or is failing, **Last run** will not update.
  2. **Scheduler logs** — Check the platform invoking `GET /api/cron/sync-delta` (for example GitHub Actions or Vercel Cron) for failures and response bodies.
- **Avoiding surprise data drift:** Check the Sync page periodically. If “Last run” stops moving, inspect the scheduler logs, Spark API status, Supabase, and the latest `sync_checkpoints` rows.

---

## Where you see the status

On **Admin → Sync**:

1. **Delta sync status** — Shows:
   - **Run ingest now** — Button to run one delta sync immediately (super_admin only). Results appear in the run log after it completes.
   - **Last run:** Time of the most recent completed delta run, or **Never** if none have run.
   - **Runs in log:** How many delta runs appear in the sync run log below.

2. **Sync run log** — Merged list of **Delta** and **Full** runs.

All of this data comes from the **sync_checkpoints** table in Supabase. Rows are written when the shared delta sync path completes or fails (`sync_type = 'delta'`).

---

## Why you might see no data

If **Last run** is “Never” and **Runs in log** is 0, it means **no delta sync run has completed yet**. Common causes:

1. **No scheduler is hitting the cron route**  
   If nothing invokes `GET /api/cron/sync-delta`, no rows will be written to `sync_checkpoints`.

2. **Scheduler auth is failing**  
   The cron route expects `Authorization: Bearer <CRON_SECRET>`. If the caller uses the wrong secret, the route returns `401` and no checkpoint is written.

3. **Running only locally**  
   Locally, run your Next.js app and call `GET /api/cron/sync-delta` yourself (for example with `curl` or your scheduler script).

4. **Delta sync is failing before completion**  
   Check the latest scheduler response and the `sync_checkpoints` table for failed rows and error payloads.

---

## How to get the ingest running

| Environment | What to do |
|-------------|------------|
| **Local** | Run your app and call `GET /api/cron/sync-delta` directly with `Authorization: Bearer <CRON_SECRET>`. |
| **Production** | Use a scheduler that calls `GET /api/cron/sync-delta` with `Authorization: Bearer <CRON_SECRET>`. This repository includes `.github/workflows/sync-scheduler.yml` for GitHub Actions-based scheduling. |

After the first successful delta run, **Last run** and **Runs in log** on the sync page will show data.

---

## Getting notified when ingest fails

To avoid losing sync without noticing:

1. **Scheduler alerts** — Enable notifications on the platform calling the cron route (for example GitHub Actions failure notifications).
2. **Sync page** — Visit **Admin → Sync** regularly. If the last delta run stops moving, investigate the scheduler logs, Spark API, and Supabase.

---

## Summary

- **Status** = last completed delta run + number of delta runs in the log (from `sync_checkpoints`).
- **No data** = no completed delta runs ⇒ usually the scheduler is not calling the route or auth is wrong.
- **Fix:** Call `GET /api/cron/sync-delta` on a repeating cadence with `Authorization: Bearer <CRON_SECRET>`. This repo includes a GitHub Actions scheduler workflow for that purpose.
