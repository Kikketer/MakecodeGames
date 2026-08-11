-- Tracks crawl progress per forum topic (game or chat posts) so daily
-- ingest can stop as soon as it reaches a previously-seen post, instead
-- of re-crawling through all the chat pages between the last game and
-- the new posts. Discourse post ids are monotonic within a topic, so
-- any post with id <= last_seen_post_id has been crawled before.
create table if not exists ingested_topics (
  forum_topic_id integer primary key,
  last_seen_post_id integer not null default 0,
  last_ingested_at timestamptz default now()
);

alter table if exists ingested_topics enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ingested_topics' and policyname = 'ingested_topics_select'
  ) then
    create policy ingested_topics_select on public.ingested_topics for select to anon, authenticated using (true);
  end if;
end $$;
