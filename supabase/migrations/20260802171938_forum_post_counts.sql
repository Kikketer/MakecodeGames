alter table if exists game_forum_posts
  add column if not exists reply_count integer default 0,
  add column if not exists view_count integer default 0;
