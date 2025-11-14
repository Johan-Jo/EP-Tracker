# /dashboard/time Performance Analysis

## Data Fetch Map

### Initial render
- `GET /api/time/entries?page=0&limit=100`  
  Fetches the first page of lean time entry rows (ids, timestamps, billing/meta, related project/user names) ordered by `start_at DESC`. No longer downloads unused phase/work-order data.
- `GET /api/time/entries/stats`  
  Separate endpoint performing server-side aggregates (today/yesterday/this-week/this-month) over the filtered scope.
- `supabase.from('projects')` (`id`, `name`, `billing_mode`, `default_time_billing_type`)  
  Populates the project selector with 5 min cache.
- `supabase.from('ata')` (`id`, `title`, `status`, `billing_type`, `created_at`)  
  Runs only after a project is explicitly selected (or prefilled via URL).
- `GET /api/fixed-time-blocks?projectId=<id>`  
  Fires lazily when the selected project supports fast billing and the section becomes relevant; response trimmed to `id, name, amount_sek, status`.
- `GET /api/organizations/members`  
  Deferred until the filter dialog opens (admin/foreman/finance only) and then cached for 10 minutes.

### Filter changes (project, user, status, date range)
- `GET /api/time/entries?page=0&limit=100`  
  Re-fetches just the first page with the new filters; previous pages are discarded automatically by React Query due to key changes.
- `GET /api/time/entries/stats`  
  Recomputed with the same filter set.

### “Visa fler” / Load more
- `GET /api/time/entries?page=<n>&limit=100`  
  Requests only the next page. Already-downloaded pages are preserved client-side; no re-download of earlier data.

### Diary interaction
- `GET /api/diary/find?project_id=<id>&date=<YYYY-MM-DD>&user_id=<id>`  
  Fired per entry when user clicks “Dagbok”. Returns only `id` to route user to existing or new diary.
- Aggregated diary lookup inside `/api/time/entries`  
  After the list query, the API issues a secondary lookup scoped to the current page using indexed filters on `org_id`, `project_id`, `created_by`, and date span.

## Key Performance Risks (now addressed)
- **Wide payload from `/api/time/entries`:** ✅ Narrowed to list-essential columns plus minimal related names.
- **Large default batch:** ✅ Initial page capped at 100 rows with infinite pagination (no repeated downloads).
- **Diary enrichment scans:** ✅ New composite index on `diary_entries (org_id, project_id, created_by, date)` keeps lookups index-only.
- **Filter panel data upfront:** ✅ Organization members fetch lazily on dialog open; ATA/fixed blocks fetch only after project selection.
- **React Query churn & client stats:** ✅ Infinite query keeps previous pages while stats moved to `/api/time/entries/stats`.
- **Fixed block payload size:** ✅ API trimmed to `id, name, amount_sek, status`.

## Implemented Improvements
1. **API restructuring**
   - `/api/time/entries` now serves a lean, paginated list (`page`/`limit` parameters) and returns metadata `{ page, pageSize, hasMore }`.
   - `/api/time/entries/stats` aggregates `duration_min` server-side for today, yesterday, current week, and month.
   - Diary enrichment constrained to the current page window and backed by a dedicated index.
2. **Client updates**
   - `TimePageNew` uses `useInfiniteQuery` for incremental loading and `useQuery` for stats.
   - Filter dialog triggers org member fetch on demand with cached results; ATA and fixed time blocks have guarded `enabled` flags.
   - Stats cards display server-calculated values with lightweight loading indicators.
3. **Database indexes**
   - `idx_time_entries_org_user_start_desc` speeds filtering by organization/user ordered by `start_at`.
   - `idx_time_entries_org_project_start_desc` optimizes organization + project sorting.
   - `idx_diary_entries_org_project_user_date` supports diary cross-link lookups used by the list API.
4. **Developer ergonomics**
   - React Query cache invalidation now targets specific list/stats keys after create/update/delete.
   - Default page size documented via shared `PAGE_SIZE` constant (`100`).

## Monitoring & Next Steps
- Observe Supabase query latency for `/api/time/entries` and `/api/time/entries/stats` under heavy filters; adjust page size if real-world usage favors smaller batches.
- Consider batching the four aggregate SUM queries inside `/api/time/entries/stats` into a single SQL view/RPC if latency becomes noticeable.
- Evaluate further payload slimming (e.g., lazy-loading diary text) if bandwidth remains a concern.

