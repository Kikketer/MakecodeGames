insert into forum_categories (id, name, slug, parent_category_id)
values
  (5, 'Arcade', 'share-your-arcade-projects-here', null),
  (13, 'Show & Tell', 'show-tell', 5),
  (14, 'Help', 'help', 5),
  (15, 'Game Design', 'game-design', 5),
  (22, 'Collaboration', 'collaboration', 5),
  (25, 'Global MakeCode Arcade Game Jam', 'global-gj', 5)
on conflict (id) do nothing;
