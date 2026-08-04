create table if not exists game_stats_snapshots (
  game_id uuid primary key references games(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  likes integer not null default 0,
  clicks integer not null default 0,
  link_clicks integer not null default 0,
  plays integer not null default 0
);

create index if not exists idx_game_stats_snapshots_recorded
  on game_stats_snapshots (recorded_at desc);

alter table if exists game_stats_snapshots enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'game_stats_snapshots' and policyname = 'game_stats_snapshots_select'
  ) then
    create policy game_stats_snapshots_select on public.game_stats_snapshots for select to anon, authenticated using (true);
  end if;
end $$;

create or replace function snapshot_game_stats()
returns integer
language plpgsql
as $$
declare
  inserted_count integer;
begin
  insert into game_stats_snapshots (game_id, recorded_at, likes, clicks, link_clicks, plays)
  select
    g.id,
    now(),
    coalesce(f.likes, 0),
    coalesce(c.clicks, 0),
    coalesce(f.link_clicks, 0),
    coalesce(c.clicks, 0) + coalesce(f.link_clicks, 0)
  from games g
  left join (
    select game_id, sum(reaction_count) as likes, sum(link_clicks) as link_clicks
    from game_forum_posts
    group by game_id
  ) f on f.game_id = g.id
  left join (
    select game_id, count(id) as clicks
    from game_clicks
    group by game_id
  ) c on c.game_id = g.id
  on conflict (game_id) do update set
    recorded_at = excluded.recorded_at,
    likes = excluded.likes,
    clicks = excluded.clicks,
    link_clicks = excluded.link_clicks,
    plays = excluded.plays;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

grant execute on function snapshot_game_stats() to service_role;
