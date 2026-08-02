create table if not exists ingest_log (
  id uuid default gen_random_uuid() primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz not null default now(),
  games integer not null default 0,
  posts integer not null default 0,
  errors text[] not null default '{}'
);

alter table if exists ingest_log enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ingest_log' and policyname = 'ingest_log_select'
  ) then
    create policy ingest_log_select on public.ingest_log for select to anon, authenticated using (true);
  end if;
end $$;
