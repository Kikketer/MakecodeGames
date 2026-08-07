import { algoliasearch } from "algoliasearch";
import type { SearchClient } from "algoliasearch";

export const GAMES_INDEX = "games";
export const FORUM_TOPICS_INDEX = "forum_topics";

function getClient(apiKeyEnv: string): SearchClient | null {
  const appId = process.env.ALGOLIA_APP_ID;
  const apiKey = process.env[apiKeyEnv];
  if (!appId || !apiKey) return null;
  try {
    return algoliasearch(appId, apiKey);
  } catch {
    return null;
  }
}

export function getAlgoliaSearchClient(): SearchClient | null {
  return getClient("ALGOLIA_SEARCH_API_KEY");
}

export function getAlgoliaWriteClient(): SearchClient | null {
  return getClient("ALGOLIA_WRITE_API_KEY");
}
