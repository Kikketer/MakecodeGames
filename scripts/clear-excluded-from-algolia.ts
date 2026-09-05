import { getAlgoliaWriteClient, GAMES_INDEX } from "../lib/algolia";
import { supabaseServer } from "../lib/supabase-server";

function buildAuthorFilter(usernames: string[]): string {
  if (usernames.length === 0) return "";
  return usernames.map((u) => `author_username:"${u.replace(/"/g, '\\"')}"`).join(" OR ");
}

async function main() {
  const client = getAlgoliaWriteClient();
  if (!client) {
    throw new Error("Missing Algolia credentials. Set ALGOLIA_APP_ID and ALGOLIA_WRITE_API_KEY.");
  }

  console.log("Fetching excluded authors from Supabase...");
  const { data: excludedAuthors, error } = await supabaseServer
    .from("excluded_authors")
    .select("author_username");

  if (error) throw error;

  const usernames = ((excludedAuthors || []) as { author_username: string }[])
    .map((row) => row.author_username)
    .filter((username): username is string => typeof username === "string" && username.length > 0);

  if (usernames.length === 0) {
    console.log("No excluded authors found; nothing to clear from Algolia.");
    return;
  }

  console.log(`Ensuring author_username is filterable and clearing ${usernames.length} excluded author(s) from Algolia...`);
  await client.setSettings({
    indexName: GAMES_INDEX,
    indexSettings: {
      attributesForFaceting: ["author_username"],
    },
  });

  const filter = buildAuthorFilter(usernames);
  const result = await client.deleteBy({
    indexName: GAMES_INDEX,
    deleteByParams: { filters: filter },
  });

  console.log(`Cleared games by excluded authors from Algolia (task ${result.taskID}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
