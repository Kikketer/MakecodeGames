-- Per-post Discourse post date, sourced from post.created_at during ingest.
-- Nullable because existing rows won't have it until backfilled; the sorts
-- fall back to games.first_seen_at when posted_at is null so nothing
-- disappears before the backfill runs.
alter table if exists game_forum_posts
  add column if not exists posted_at timestamptz;
