import { getAlgoliaWriteClient, GAMES_INDEX, FORUM_TOPICS_INDEX } from "../lib/algolia";
import { supabaseServer } from "../lib/supabase-server";

const GAME_FIELDS = [
  "id",
  "title",
  "description",
  "author_username",
  "thumb_url",
  "game_url",
  "first_seen_at",
];

const TOPIC_FIELDS = [
  "forum_topic_id",
  "forum_topic_title",
  "forum_category_name",
  "reply_count",
  "view_count",
  "seen_at",
];

async function setupGamesIndex(client: ReturnType<typeof getAlgoliaWriteClient>) {
  if (!client) throw new Error("Algolia write client is not configured");

  console.log("Configuring games index...");
  await client.setSettings({
    indexName: GAMES_INDEX,
    indexSettings: {
      searchableAttributes: ["title", "description", "author_username"],
      attributesForFaceting: ["author_username"],
      attributesToRetrieve: [
        "objectID",
        "title",
        "description",
        "author_username",
        "thumb_url",
        "game_url",
        "first_seen_at",
      ],
      customRanking: ["desc(first_seen_at)"],
      typoTolerance: true,
      queryType: "prefixLast",
    },
  });

  console.log("Fetching games and excluded authors from Supabase...");
  const [{ data: games, error: gamesError }, { data: excludedAuthors, error: excludedError }] = await Promise.all([
    supabaseServer.from("games").select(GAME_FIELDS.join(",")),
    supabaseServer.from("excluded_authors").select("author_username"),
  ]);

  if (gamesError) throw gamesError;
  if (excludedError) throw excludedError;

  const excludedUsernames = new Set(
    ((excludedAuthors || []) as { author_username: string }[])
      .map((row) => row.author_username)
      .filter((username): username is string => typeof username === "string" && username.length > 0)
  );

  const gameRows = ((games || []) as unknown) as Record<string, unknown>[];

  const objects = gameRows
    .filter((game) => !excludedUsernames.has((game.author_username as string | null | undefined) ?? ""))
    .map((game) => ({
      objectID: game.id as string,
      title: game.title as string,
      description: game.description as string | null,
      author_username: game.author_username as string | null,
      thumb_url: game.thumb_url as string,
      game_url: game.game_url as string,
      first_seen_at: new Date(game.first_seen_at as string).getTime(),
    }));

  console.log(`Replacing ${objects.length} game records in Algolia...`);
  await client.replaceAllObjects({ indexName: GAMES_INDEX, objects });
  console.log("Games index ready.");
}

async function setupTopicsIndex(client: ReturnType<typeof getAlgoliaWriteClient>) {
  if (!client) throw new Error("Algolia write client is not configured");

  console.log("Configuring forum_topics index...");
  await client.setSettings({
    indexName: FORUM_TOPICS_INDEX,
    indexSettings: {
      searchableAttributes: ["title", "category_name"],
      attributesToRetrieve: [
        "forum_topic_id",
        "title",
        "category_name",
        "reply_count",
        "view_count",
        "first_seen_at",
      ],
      customRanking: ["desc(first_seen_at)"],
      typoTolerance: true,
      queryType: "prefixLast",
    },
  });

  console.log("Fetching forum topics from Supabase...");
  const { data: posts, error } = await supabaseServer
    .from("game_forum_posts")
    .select(TOPIC_FIELDS.join(","));

  if (error) throw error;

  const postRows = ((posts || []) as unknown) as Record<string, unknown>[];

  const topicMap = new Map<
    number,
    {
      forum_topic_id: number;
      title: string;
      category_name: string | null;
      reply_count: number;
      view_count: number;
      first_seen_at: number;
    }
  >();

  for (const post of postRows) {
    const id = Number(post.forum_topic_id);
    const seenAt = post.seen_at ? new Date(post.seen_at as string).getTime() : Date.now();
    const existing = topicMap.get(id);

    if (!existing) {
      topicMap.set(id, {
        forum_topic_id: id,
        title: (post.forum_topic_title as string) || `Topic ${id}`,
        category_name: (post.forum_category_name as string) || null,
        reply_count: Number(post.reply_count || 0),
        view_count: Number(post.view_count || 0),
        first_seen_at: seenAt,
      });
    } else {
      existing.reply_count = Math.max(existing.reply_count, Number(post.reply_count || 0));
      existing.view_count = Math.max(existing.view_count, Number(post.view_count || 0));
      existing.first_seen_at = Math.min(existing.first_seen_at, seenAt);
      if (post.forum_topic_title && !existing.title) {
        existing.title = post.forum_topic_title as string;
      }
      if (post.forum_category_name && !existing.category_name) {
        existing.category_name = post.forum_category_name as string;
      }
    }
  }

  const objects = Array.from(topicMap.values()).map((topic) => ({
    objectID: String(topic.forum_topic_id),
    ...topic,
  }));

  console.log(`Replacing ${objects.length} topic records in Algolia...`);
  await client.replaceAllObjects({ indexName: FORUM_TOPICS_INDEX, objects });
  console.log("Forum topics index ready.");
}

async function main() {
  const client = getAlgoliaWriteClient();
  if (!client) {
    throw new Error(
      "Missing Algolia credentials. Set ALGOLIA_APP_ID and ALGOLIA_WRITE_API_KEY."
    );
  }

  await setupGamesIndex(client);
  await setupTopicsIndex(client);
  console.log("Algolia setup complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
