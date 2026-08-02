alter view game_stats set (security_invoker = false);
alter view game_category_stats set (security_invoker = false);

grant select on game_stats to anon, authenticated;
grant select on game_category_stats to anon, authenticated;
