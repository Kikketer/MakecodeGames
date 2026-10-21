-- Fix: trending_score was permanently ~0 for every game.
--
-- game_stats_snapshots holds ONE row per game (game_id PK, upserted). The
-- ingest calls snapshot_game_stats() and then refresh_game_daily_stats()
-- back-to-back, and both read the same live tables. The materialized
-- game_daily_stats view therefore always equals the snapshot it is diffed
-- against, so trending_score = (likes + plays) - snapshot(likes + plays) = 0
-- and the Trending sort degenerated to a stable, never-changing order.
--
-- trending_score is supposed to be the engagement gained since a historical
-- baseline. Make the baseline a rolling ~24h one: only insert/update a
-- game's snapshot when it is missing or older than a day. The ingest still
-- calls this every run; calls within the window are cheap no-ops, and the
-- first call after a baseline goes stale rolls it forward.

create or replace function snapshot_game_stats()
returns integer
language plpgsql
as $$
declare
  inserted_count integer;
begin
  insert into game_stats_snapshots (game_id, recorded_at, likes, clicks, link_clicks, plays)
  select
    g.id,
    now(),
    coalesce(f.likes, 0),
    coalesce(c.clicks, 0),
    coalesce(f.link_clicks, 0),
    coalesce(c.clicks, 0) + coalesce(f.link_clicks, 0)
  from games g
  left join (
    select game_id, sum(reaction_count) as likes, sum(link_clicks) as link_clicks
    from game_forum_posts
    group by game_id
  ) f on f.game_id = g.id
  left join (
    select game_id, count(id) as clicks
    from game_clicks
    group by game_id
  ) c on c.game_id = g.id
  left join game_stats_snapshots s on s.game_id = g.id
  where s.game_id is null or s.recorded_at < now() - interval '24 hours'
  on conflict (game_id) do update set
    recorded_at = excluded.recorded_at,
    likes = excluded.likes,
    clicks = excluded.clicks,
    link_clicks = excluded.link_clicks,
    plays = excluded.plays
  where game_stats_snapshots.recorded_at < now() - interval '24 hours';

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;
