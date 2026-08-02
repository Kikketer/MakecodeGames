create table if not exists forum_categories (
  id integer primary key,
  name text not null,
  slug text not null,
  parent_category_id integer
);

create table if not exists games (
  id uuid default gen_random_uuid() primary key,
  share_url text not null unique,
  makecode_id text not null,
  shortid text,
  persist_id text,
  title text not null,
  description text,
  thumb_url text not null,
  game_url text not null,
  author_forum_id integer,
  author_username text,
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists game_jams (
  id uuid default gen_random_uuid() primary key,
  forum_topic_id integer not null unique,
  title text not null,
  slug text,
  theme text,
  category_id integer references forum_categories(id),
  type text check (type in ('mini','global','other')),
  announced_at timestamptz,
  status text check (status in ('active','closed','upcoming')) default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists game_forum_posts (
  game_id uuid not null references games(id) on delete cascade,
  forum_topic_id integer not null,
  forum_post_id integer not null,
  forum_url text not null,
  forum_category_id integer not null references forum_categories(id),
  forum_category_name text not null,
  jam_id uuid references game_jams(id) on delete set null,
  seen_at timestamptz default now(),
  primary key (game_id, forum_topic_id, forum_post_id)
);

create table if not exists game_likes (
  game_id uuid not null references games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (game_id, user_id)
);

create table if not exists game_clicks (
  id uuid default gen_random_uuid() primary key,
  game_id uuid not null references games(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  clicked_at timestamptz default now()
);

create or replace view game_stats as
select
  g.id as game_id,
  count(distinct l.user_id) as likes,
  count(distinct c.id) as clicks
from games g
left join game_likes l on l.game_id = g.id
left join game_clicks c on c.game_id = g.id
group by g.id;

create or replace view game_category_stats as
select
  g.id as game_id,
  p.forum_category_id,
  p.forum_category_name,
  p.jam_id,
  count(distinct l.user_id) as likes,
  count(distinct c.id) as clicks,
  min(p.seen_at) as first_seen_at,
  max(p.seen_at) as last_seen_at
from games g
join game_forum_posts p on p.game_id = g.id
left join game_likes l on l.game_id = g.id
left join game_clicks c on c.game_id = g.id
group by g.id, p.forum_category_id, p.forum_category_name, p.jam_id;

alter table if exists forum_categories enable row level security;
alter table if exists games enable row level security;
alter table if exists game_jams enable row level security;
alter table if exists game_forum_posts enable row level security;
alter table if exists game_likes enable row level security;
alter table if exists game_clicks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'games' and policyname = 'games_select'
  ) then
    create policy games_select on public.games for select to anon, authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'forum_categories' and policyname = 'forum_categories_select'
  ) then
    create policy forum_categories_select on public.forum_categories for select to anon, authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'game_jams' and policyname = 'game_jams_select'
  ) then
    create policy game_jams_select on public.game_jams for select to anon, authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'game_forum_posts' and policyname = 'game_forum_posts_select'
  ) then
    create policy game_forum_posts_select on public.game_forum_posts for select to anon, authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'game_likes' and policyname = 'game_likes_insert_own'
  ) then
    create policy game_likes_insert_own on public.game_likes for insert to authenticated with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'game_likes' and policyname = 'game_likes_delete_own'
  ) then
    create policy game_likes_delete_own on public.game_likes for delete to authenticated using (user_id = auth.uid());
  end if;
end $$;
