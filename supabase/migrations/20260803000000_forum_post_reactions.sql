alter table if exists game_forum_posts
  add column if not exists reaction_count integer default 0,
  add column if not exists reaction_refreshed_at timestamptz;
