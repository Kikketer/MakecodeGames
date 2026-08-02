alter table if exists game_forum_posts
  add column if not exists post_cooked text;
