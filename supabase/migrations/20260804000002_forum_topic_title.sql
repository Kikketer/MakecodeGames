alter table if exists game_forum_posts
  add column if not exists forum_topic_title text;
