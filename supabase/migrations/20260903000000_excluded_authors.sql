-- Maintains a list of authors whose games should still be ingested and
-- indexed, but hidden from all public discovery surfaces.
create table if not exists excluded_authors (
  author_username text primary key,
  created_at timestamptz default now()
);

comment on table excluded_authors is
  'Authors whose games should be omitted from public game listings, search, and rankings.';

alter table if exists excluded_authors enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'excluded_authors'
      and policyname = 'excluded_authors_select'
  ) then
    create policy excluded_authors_select on public.excluded_authors
      for select to anon, authenticated using (true);
  end if;
end $$;
