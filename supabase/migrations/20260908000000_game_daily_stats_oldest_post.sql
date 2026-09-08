-- The same share link can be posted more than once (re-posts, other people
-- sharing a game). The oldest post is the game's canonical post: the ingest
-- now moves games.author_* to the earliest poster, and this view should
-- point forum_url / forum_topic_title at that same post instead of an
-- arbitrary max(). Aggregates (likes, plays, replies, views) still sum
-- across every post that links the game.
--
-- game_scores depends on game_daily_stats, so it is dropped and recreated
-- here as well (materialized views can't be altered in place).

drop view if exists game_scores;
drop materialized view if exists game_daily_stats;

create materialized view game_daily_stats as
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
  o.forum_url,
  o.forum_topic_title,
  coalesce(f.replies, 0) as replies,
  coalesce(f.views, 0) as views,
  f.posted_at,
  null::text as post_cooked
from games g
left join (
  select
    game_id,
    sum(reaction_count) as likes,
    sum(link_clicks) as link_clicks,
    sum(reply_count) as replies,
    sum(view_count) as views,
    min(posted_at) as posted_at
  from game_forum_posts
  group by game_id
) f on f.game_id = g.id
left join (
  select distinct on (game_id)
    game_id,
    forum_url,
    forum_topic_title
  from game_forum_posts
  order by game_id, posted_at asc nulls last, forum_post_id asc
) o on o.game_id = g.id
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

create index if not exists idx_game_daily_stats_sort_date
  on game_daily_stats ((coalesce(posted_at, first_seen_at)) desc);

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

alter view game_scores set (security_invoker = false);

grant select on game_scores to anon, authenticated;
