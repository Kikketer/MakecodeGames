import { supabaseServer } from "@/lib/supabase-server";
import { getExtensionRepoHeadSha } from "./github";

/**
 * Change detection for extension documentation.
 *
 * Tracks the last-generated state per extension in the `extension_doc_status`
 * Supabase table so we can skip repos that haven't changed since the last
 * documentation run.
 */

export interface ExtensionDocStatus {
  owner: string;
  repo: string;
  lastCommitSha: string | null;
  lastGeneratedAt: string | null;
  lastPrNumber: number | null;
  lastPrUrl: string | null;
  status: "in_progress" | "published" | "failed";
  lastError: string | null;
}

/** Row shape in Supabase (snake_case). */
interface StatusRow {
  owner: string;
  repo: string;
  last_commit_sha: string | null;
  last_generated_at: string | null;
  last_pr_number: number | null;
  last_pr_url: string | null;
  status: string;
  last_error: string | null;
}

function rowToStatus(row: StatusRow): ExtensionDocStatus {
  return {
    owner: row.owner,
    repo: row.repo,
    lastCommitSha: row.last_commit_sha,
    lastGeneratedAt: row.last_generated_at,
    lastPrNumber: row.last_pr_number,
    lastPrUrl: row.last_pr_url,
    status: row.status as ExtensionDocStatus["status"],
    lastError: row.last_error,
  };
}

/** Read the stored documentation status for an extension. Returns undefined if never documented. */
export async function getExtensionDocStatus(owner: string, repo: string): Promise<ExtensionDocStatus | undefined> {
  const { data, error } = await supabaseServer
    .from("extension_doc_status")
    .select("owner, repo, last_commit_sha, last_generated_at, last_pr_number, last_pr_url, status, last_error")
    .eq("owner", owner)
    .eq("repo", repo)
    .limit(1);

  if (error) throw error;
  if (!data || data.length === 0) return undefined;
  return rowToStatus(data[0] as StatusRow);
}

/**
 * Check whether an extension needs re-documentation by comparing the
 * extension repo's current HEAD SHA against the last-generated SHA.
 *
 * Returns `true` if the extension should be re-documented (new commits
 * or never documented before), `false` if the SHA is unchanged.
 */
export async function shouldRegenerateExtension(owner: string, repo: string, token?: string): Promise<{
  regenerate: boolean;
  currentSha: string;
  storedSha: string | null;
}> {
  const currentSha = await getExtensionRepoHeadSha(owner, repo, token);
  const status = await getExtensionDocStatus(owner, repo);

  if (!status || !status.lastCommitSha) {
    return { regenerate: true, currentSha, storedSha: null };
  }

  return {
    regenerate: currentSha !== status.lastCommitSha,
    currentSha,
    storedSha: status.lastCommitSha,
  };
}

/** Update the documentation status after a successful generation. */
export async function recordSuccessfulGeneration(
  owner: string,
  repo: string,
  sha: string,
  prInfo: { number: number; url: string },
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabaseServer
    .from("extension_doc_status")
    .upsert(
      {
        owner,
        repo,
        last_commit_sha: sha,
        last_generated_at: now,
        last_pr_number: prInfo.number,
        last_pr_url: prInfo.url,
        status: "in_progress",
        last_error: null,
        updated_at: now,
      },
      { onConflict: "owner,repo" },
    );
  if (error) throw error;
}

/** Mark a generation as failed with an error message. */
export async function recordFailedGeneration(owner: string, repo: string, sha: string, errorMessage: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabaseServer
    .from("extension_doc_status")
    .upsert(
      {
        owner,
        repo,
        last_commit_sha: sha,
        status: "failed",
        last_error: errorMessage,
        updated_at: now,
      },
      { onConflict: "owner,repo" },
    );
  if (error) throw error;
}
