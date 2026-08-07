alter table if exists game_forum_posts
  add column if not exists link_clicks int default 0;
