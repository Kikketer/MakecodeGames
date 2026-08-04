alter table if exists game_forum_posts
  add column if not exists last_parsed_at timestamptz;
