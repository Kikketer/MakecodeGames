/**
 * Minimal GitHub REST API client for the extension documentation workflow.
 *
 * Uses the Git Database API (blobs → tree → commit → ref) to create commits
 * with multiple file changes, then creates a pull request. This avoids
 * needing a local git checkout in the Vercel Workflow sandbox.
 *
 * The token is read from `GITHUB_TOKEN`. The repo owner/name defaults to
 * the MakecodeGames repo (inferred from the git remote) but can be
 * overridden for testing or multi-repo use.
 */

const GITHUB_API = "https://api.github.com";

/** The default repo to commit to, parsed from the origin remote. */
export const DEFAULT_REPO = { owner: "Kikketer", name: "MakecodeGames" };

export interface RepoRef {
  owner: string;
  name: string;
}

export interface GitHubFile {
  /** Repository-relative path, e.g. "content/extensions/jwunderl/arcade-sprite-util.ts". */
  path: string;
  /** File contents (UTF-8). */
  content: string;
}

export interface PullRequestResult {
  number: number;
  url: string;
  branch: string;
  commitSha: string;
}

function getToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN environment variable is required");
  return token;
}

async function ghFetch(path: string, options: RequestInit = {}, token?: string): Promise<Response> {
  const auth = token ?? getToken();
  const url = path.startsWith("http") ? path : `${GITHUB_API}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${auth}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return response;
}

async function ghJson<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await ghFetch(path, options, token);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${response.status} ${path}: ${text}`);
  }
  return (await response.json()) as T;
}

/** Get the SHA of the default branch HEAD. */
export async function getDefaultBranchSha(
  repo: RepoRef = DEFAULT_REPO,
  token?: string,
): Promise<{ sha: string; branch: string }> {
  // Get the repo to find the default branch
  const repoInfo = await ghJson<{ default_branch: string }>(`/repos/${repo.owner}/${repo.name}`, {}, token);
  const branch = repoInfo.default_branch;

  const ref = await ghJson<{ object: { sha: string } }>(
    `/repos/${repo.owner}/${repo.name}/git/refs/heads/${branch}`,
    {},
    token,
  );
  return { sha: ref.object.sha, branch };
}

/** Get the SHA of a branch, or undefined if it doesn't exist. */
export async function getBranchSha(
  branch: string,
  repo: RepoRef = DEFAULT_REPO,
  token?: string,
): Promise<string | undefined> {
  const response = await ghFetch(`/repos/${repo.owner}/${repo.name}/git/refs/heads/${branch}`, {}, token);
  if (response.status === 404) return undefined;
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status} getting branch ${branch}: ${await response.text()}`);
  }
  const ref = (await response.json()) as { object: { sha: string } };
  return ref.object.sha;
}

/** Create a new branch from the given SHA, or return the existing SHA. */
export async function ensureBranch(
  branch: string,
  fromSha: string,
  repo: RepoRef = DEFAULT_REPO,
  token?: string,
): Promise<string> {
  const existing = await getBranchSha(branch, repo, token);
  if (existing) return existing;

  await ghJson(
    `/repos/${repo.owner}/${repo.name}/git/refs`,
    {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: fromSha }),
    },
    token,
  );
  return fromSha;
}

/** Create a blob and return its SHA. */
async function createBlob(content: string, repo: RepoRef, token?: string): Promise<string> {
  const blob = await ghJson<{ sha: string }>(
    `/repos/${repo.owner}/${repo.name}/git/blobs`,
    {
      method: "POST",
      body: JSON.stringify({ content, encoding: "utf-8" }),
    },
    token,
  );
  return blob.sha;
}

/** Read a file from the repo at a given ref. Returns undefined if not found. */
export async function readFileFromRepo(
  path: string,
  ref: string,
  repo: RepoRef = DEFAULT_REPO,
  token?: string,
): Promise<string | undefined> {
  const response = await ghFetch(
    `/repos/${repo.owner}/${repo.name}/contents/${path}?ref=${ref}`,
    {},
    token,
  );
  if (response.status === 404) return undefined;
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status} reading ${path}: ${await response.text()}`);
  }
  const data = (await response.json()) as { content: string; encoding: string };
  if (data.encoding === "base64") {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }
  return data.content;
}

/** Get the latest commit SHA for an extension repo (for change detection). */
export async function getExtensionRepoHeadSha(owner: string, repo: string, token?: string): Promise<string> {
  const branchInfo = await ghJson<{ object: { sha: string } }>(
    `/repos/${owner}/${repo}/git/refs/heads`,
    {},
    token,
  ).catch(async () => {
    // Some repos only have master, not main — try the default branch via the repo info
    const repoInfo = await ghJson<{ default_branch: string }>(`/repos/${owner}/${repo}`, {}, token);
    return ghJson<{ object: { sha: string } }>(
      `/repos/${owner}/${repo}/git/refs/heads/${repoInfo.default_branch}`,
      {},
      token,
    );
  });
  return branchInfo.object.sha;
}

/**
 * Commit multiple files to a branch as a single commit.
 * Uses the Git Database API: create blobs → create tree → create commit → update ref.
 */
export async function commitFilesToBranch(
  branch: string,
  files: GitHubFile[],
  message: string,
  repo: RepoRef = DEFAULT_REPO,
  token?: string,
): Promise<string> {
  // Get the current branch HEAD commit and its tree
  const branchSha = await getBranchSha(branch, repo, token);
  if (!branchSha) throw new Error(`Branch ${branch} does not exist`);

  const commitInfo = await ghJson<{ tree: { sha: string } }>(
    `/repos/${repo.owner}/${repo.name}/git/commits/${branchSha}`,
    {},
    token,
  );
  const parentTreeSha = commitInfo.tree.sha;

  // Create blobs for each file
  const treeItems: { path: string; mode: "100644"; type: "blob"; sha: string }[] = [];
  for (const file of files) {
    const blobSha = await createBlob(file.content, repo, token);
    treeItems.push({ path: file.path, mode: "100644", type: "blob", sha: blobSha });
  }

  // Create a tree with the blobs, rooted at the parent tree
  const tree = await ghJson<{ sha: string }>(
    `/repos/${repo.owner}/${repo.name}/git/trees`,
    {
      method: "POST",
      body: JSON.stringify({ base_tree: parentTreeSha, tree: treeItems }),
    },
    token,
  );

  // Create the commit
  const commit = await ghJson<{ sha: string }>(
    `/repos/${repo.owner}/${repo.name}/git/commits`,
    {
      method: "POST",
      body: JSON.stringify({ message, tree: tree.sha, parents: [branchSha] }),
    },
    token,
  );

  // Update the branch ref to point to the new commit
  await ghJson(
    `/repos/${repo.owner}/${repo.name}/git/refs/heads/${branch}`,
    {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha }),
    },
    token,
  );

  return commit.sha;
}

/** Create a pull request from a head branch to a base branch. */
export async function createPullRequest(
  title: string,
  body: string,
  head: string,
  base: string,
  repo: RepoRef = DEFAULT_REPO,
  token?: string,
): Promise<PullRequestResult> {
  const pr = await ghJson<{ number: number; html_url: string }>(
    `/repos/${repo.owner}/${repo.name}/pulls`,
    {
      method: "POST",
      body: JSON.stringify({ title, body, head, base }),
    },
    token,
  );
  return { number: pr.number, url: pr.html_url, branch: head, commitSha: "" };
}

/**
 * Full PR creation flow: ensure the branch exists, commit files, create a PR.
 * If the PR already exists for this branch, returns its info.
 */
export async function createDocumentationPullRequest(
  extensionOwner: string,
  extensionRepo: string,
  files: GitHubFile[],
  options: { commitMessage?: string; prBody?: string; repo?: RepoRef; token?: string } = {},
): Promise<PullRequestResult> {
  const repo = options.repo ?? DEFAULT_REPO;
  const token = options.token;
  const branchName = `docs/${extensionOwner}-${extensionRepo}`;

  // Get the default branch SHA to branch from
  const { sha: defaultSha, branch: defaultBranch } = await getDefaultBranchSha(repo, token);

  // Create or reuse the branch
  await ensureBranch(branchName, defaultSha, repo, token);

  // Commit the files
  const commitMessage =
    options.commitMessage ?? `docs: auto-generate documentation for ${extensionOwner}/${extensionRepo}`;
  const commitSha = await commitFilesToBranch(branchName, files, commitMessage, repo, token);

  // Check if a PR already exists for this branch
  const existingPrs = await ghJson<{ number: number; html_url: string; state: string }[]>(
    `/repos/${repo.owner}/${repo.name}/pulls?head=${repo.owner}:${branchName}&state=open`,
    {},
    token,
  );
  if (existingPrs.length > 0) {
    return {
      number: existingPrs[0].number,
      url: existingPrs[0].html_url,
      branch: branchName,
      commitSha,
    };
  }

  // Create a new PR
  const prBody =
    options.prBody ??
    `## Automated extension documentation

This PR was auto-generated by the extension documentation workflow.

- **Extension:** \`${extensionOwner}/${extensionRepo}\`
- **Files:** ${files.length} file(s) changed

Review the generated documentation at [/extensions-beta/${extensionOwner}/${extensionRepo}](/extensions-beta/${extensionOwner}/${extensionRepo}) before merging.`;

  const pr = await createPullRequest(
    `docs: auto-document ${extensionOwner}/${extensionRepo}`,
    prBody,
    branchName,
    defaultBranch,
    repo,
    token,
  );

  return { ...pr, commitSha };
}
