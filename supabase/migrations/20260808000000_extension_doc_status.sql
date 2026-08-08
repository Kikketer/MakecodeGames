create table if not exists extension_doc_status (
  owner text not null,
  repo text not null,
  last_commit_sha text,
  last_generated_at timestamptz,
  last_pr_number integer,
  last_pr_url text,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'published', 'failed')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner, repo)
);

alter table if exists extension_doc_status enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'extension_doc_status' and policyname = 'extension_doc_status_select'
  ) then
    create policy extension_doc_status_select on public.extension_doc_status
      for select to anon, authenticated using (true);
  end if;
end $$;
