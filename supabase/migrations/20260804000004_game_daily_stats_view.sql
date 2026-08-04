create materialized view if not exists game_daily_stats as
select
  g.id,
  g.share_url,
  g.makecode_id,
  g.shortid,
  g.persist_id,
  g.title,
  g.description,
  g.thumb_url,
  g.game_url,
  g.author_forum_id,
  g.author_username,
  g.first_seen_at,
  g.last_seen_at,
  g.created_at,
  coalesce(f.likes, 0) as likes,
  coalesce(c.clicks, 0) as clicks,
  coalesce(f.link_clicks, 0) as link_clicks,
  coalesce(c.clicks, 0) + coalesce(f.link_clicks, 0) as plays,
  f.forum_url,
  f.forum_topic_title,
  coalesce(f.replies, 0) as replies,
  coalesce(f.views, 0) as views,
  null::text as post_cooked
from games g
left join (
  select
    game_id,
    sum(reaction_count) as likes,
    sum(link_clicks) as link_clicks,
    sum(reply_count) as replies,
    sum(view_count) as views,
    max(forum_url) as forum_url,
    max(forum_topic_title) as forum_topic_title
  from game_forum_posts
  group by game_id
) f on f.game_id = g.id
left join (
  select game_id, count(id) as clicks
  from game_clicks
  group by game_id
) c on c.game_id = g.id;

create unique index if not exists idx_game_daily_stats_id
  on game_daily_stats (id);

create index if not exists idx_game_daily_stats_likes
  on game_daily_stats (likes desc);

create index if not exists idx_game_daily_stats_plays
  on game_daily_stats (plays desc);

-- Materialized views do not support RLS; rely on the underlying table policies.
-- Refresh is done via the refresh_game_daily_stats() function.

create or replace function refresh_game_daily_stats()
returns void
language plpgsql
as $$
begin
  refresh materialized view game_daily_stats;
end;
$$;

grant execute on function refresh_game_daily_stats() to service_role;
