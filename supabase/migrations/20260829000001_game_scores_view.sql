-- Regular (non-materialized) view that adds computed sort-score columns on
-- top of game_daily_stats so the games front page can push ORDER BY + LIMIT
-- into the database.
--
-- Background: listGames()'s "all" (fetchAll) path used to select * from
-- game_daily_stats with no ORDER BY / LIMIT, sort the (Supabase-row-capped)
-- subset in JS, then slice to 10. When the table grew past Supabase's default
-- row cap, the newest/hottest games fell outside the returned subset, so the
-- front page stopped changing. Querying this view with .order(score).limit(N)
-- lets Postgres rank the full dataset and return only N rows.
--
-- A regular view is evaluated at query time, so hot_score (depends on now())
-- and trending_score (depends on the latest snapshot row) stay current without
-- needing a refresh, while still riding the pre-joined game_daily_stats data.

create or replace view game_scores as
select
  gds.*,
  coalesce(gds.posted_at, gds.first_seen_at) as sort_date,
  (gds.likes + gds.plays)::double precision
    / power(
      extract(epoch from (now() - coalesce(gds.posted_at, gds.first_seen_at))) / 3600.0 + 2.0,
      1.5
    ) as hot_score,
  (gds.likes + gds.plays) - coalesce(s.likes + s.plays, 0) as trending_score
from game_daily_stats gds
left join game_stats_snapshots s on s.game_id = gds.id;

-- Index the coalesced sort date on the materialized view so the "newest"
-- ORDER BY ... LIMIT 10 can be served from the index instead of a full sort.
create index if not exists idx_game_daily_stats_sort_date
  on game_daily_stats ((coalesce(posted_at, first_seen_at)) desc);

alter view game_scores set (security_invoker = false);

grant select on game_scores to anon, authenticated;
