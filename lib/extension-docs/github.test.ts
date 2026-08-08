import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getDefaultBranchSha,
  getBranchSha,
  ensureBranch,
  commitFilesToBranch,
  createPullRequest,
  createDocumentationPullRequest,
  readFileFromRepo,
  type GitHubFile,
  type RepoRef,
} from "./github";

/**
 * Tests for the GitHub REST API client.
 * All network calls are mocked via global fetch.
 */

const TEST_REPO: RepoRef = { owner: "testowner", name: "testrepo" };
const FAKE_TOKEN = "fake-token";

// Helper: build a mock fetch Response
function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  } as Response;
}

// Helper: set up a sequence of fetch responses
function mockFetchSequence(responses: { status: number; body: unknown }[]) {
  const calls: { url: string; options: RequestInit }[] = [];
  let idx = 0;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url: string | URL | Request, options?: RequestInit) => {
    const urlStr = typeof url === "string" ? url : url.toString();
    calls.push({ url: urlStr, options: options ?? {} });
    const resp = responses[idx] ?? responses[responses.length - 1];
    idx++;
    return mockResponse(resp.status, resp.body);
  });
  return calls;
}

beforeEach(() => {
  process.env.GITHUB_TOKEN = FAKE_TOKEN;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.GITHUB_TOKEN;
});

describe("getDefaultBranchSha", () => {
  it("returns the default branch name and HEAD SHA", async () => {
    const calls = mockFetchSequence([
      { status: 200, body: { default_branch: "main" } },
      { status: 200, body: { object: { sha: "abc123" } } },
    ]);

    const result = await getDefaultBranchSha(TEST_REPO);

    expect(result).toEqual({ sha: "abc123", branch: "main" });
    expect(calls[0].url).toContain("/repos/testowner/testrepo");
    expect(calls[1].url).toContain("/repos/testowner/testrepo/git/refs/heads/main");
  });
});

describe("getBranchSha", () => {
  it("returns the SHA when the branch exists", async () => {
    mockFetchSequence([{ status: 200, body: { object: { sha: "branchsha" } } }]);

    const sha = await getBranchSha("docs/owner-repo", TEST_REPO);
    expect(sha).toBe("branchsha");
  });

  it("returns undefined when the branch does not exist (404)", async () => {
    mockFetchSequence([{ status: 404, body: { message: "Not Found" } }]);

    const sha = await getBranchSha("docs/nonexistent", TEST_REPO);
    expect(sha).toBeUndefined();
  });
});

describe("ensureBranch", () => {
  it("creates a new branch when it does not exist", async () => {
    const calls = mockFetchSequence([
      { status: 404, body: { message: "Not Found" } }, // getBranchSha
      { status: 201, body: { ref: "refs/heads/docs/test" } }, // create branch
    ]);

    const sha = await ensureBranch("docs/test", "fromsha", TEST_REPO);

    expect(sha).toBe("fromsha");
    // Second call should be a POST to create the ref
    expect(calls[1].options.method).toBe("POST");
  });

  it("returns existing SHA when branch already exists", async () => {
    const calls = mockFetchSequence([
      { status: 200, body: { object: { sha: "existingsha" } } },
    ]);

    const sha = await ensureBranch("docs/test", "fromsha", TEST_REPO);

    expect(sha).toBe("existingsha");
    // Should not make a second call to create the branch
    expect(calls).toHaveLength(1);
  });
});

describe("readFileFromRepo", () => {
  it("returns file content decoded from base64", async () => {
    const content = "export const foo = 1;";
    const encoded = Buffer.from(content).toString("base64");
    mockFetchSequence([
      { status: 200, body: { content: encoded, encoding: "base64" } },
    ]);

    const result = await readFileFromRepo("content/extensions/index.ts", "main", TEST_REPO);
    expect(result).toBe(content);
  });

  it("returns undefined when file does not exist (404)", async () => {
    mockFetchSequence([{ status: 404, body: { message: "Not Found" } }]);

    const result = await readFileFromRepo("nonexistent.ts", "main", TEST_REPO);
    expect(result).toBeUndefined();
  });
});

describe("commitFilesToBranch", () => {
  it("creates blobs, tree, commit, and updates the ref", async () => {
    const files: GitHubFile[] = [
      { path: "content/extensions/owner/repo.ts", content: "export const x = 1;" },
      { path: "content/extensions/index.ts", content: "export const y = 2;" },
    ];

    const calls = mockFetchSequence([
      // getBranchSha
      { status: 200, body: { object: { sha: "branchsha" } } },
      // get commit info (for tree SHA)
      { status: 200, body: { tree: { sha: "parenttree" } } },
      // create blob 1
      { status: 201, body: { sha: "blob1" } },
      // create blob 2
      { status: 201, body: { sha: "blob2" } },
      // create tree
      { status: 201, body: { sha: "newtree" } },
      // create commit
      { status: 201, body: { sha: "newcommit" } },
      // update ref
      { status: 200, body: { ref: "refs/heads/docs/test" } },
    ]);

    const commitSha = await commitFilesToBranch("docs/test", files, "test commit", TEST_REPO);

    expect(commitSha).toBe("newcommit");

    // Verify the tree creation included both files
    const treeCall = calls.find((c) => c.url.includes("/git/trees"));
    expect(treeCall).toBeDefined();
    const treeBody = JSON.parse(treeCall!.options.body as string);
    expect(treeBody.tree).toHaveLength(2);
    expect(treeBody.tree[0].path).toBe("content/extensions/owner/repo.ts");
    expect(treeBody.tree[1].path).toBe("content/extensions/index.ts");
    expect(treeBody.base_tree).toBe("parenttree");

    // Verify the commit creation
    const commitCall = calls.find((c) => c.url.includes("/git/commits") && c.options.method === "POST");
    expect(commitCall).toBeDefined();
    const commitBody = JSON.parse(commitCall!.options.body as string);
    expect(commitBody.message).toBe("test commit");
    expect(commitBody.tree).toBe("newtree");
    expect(commitBody.parents).toEqual(["branchsha"]);

    // Verify the ref update
    const refCall = calls.find((c) => c.url.includes("/git/refs/heads/docs/test") && c.options.method === "PATCH");
    expect(refCall).toBeDefined();
    const refBody = JSON.parse(refCall!.options.body as string);
    expect(refBody.sha).toBe("newcommit");
  });
});

describe("createPullRequest", () => {
  it("creates a PR with the correct title, head, and base", async () => {
    const calls = mockFetchSequence([
      { status: 201, body: { number: 42, html_url: "https://github.com/test/pr/42" } },
    ]);

    const result = await createPullRequest(
      "docs: auto-document owner/repo",
      "PR body",
      "docs/owner-repo",
      "main",
      TEST_REPO,
    );

    expect(result.number).toBe(42);
    expect(result.url).toBe("https://github.com/test/pr/42");

    const prCall = calls[0];
    const body = JSON.parse(prCall.options.body as string);
    expect(body.title).toBe("docs: auto-document owner/repo");
    expect(body.head).toBe("docs/owner-repo");
    expect(body.base).toBe("main");
  });
});

describe("createDocumentationPullRequest", () => {
  it("creates branch, commits files, and opens a PR", async () => {
    const files: GitHubFile[] = [
      { path: "content/extensions/owner/repo.ts", content: "export const x = 1;" },
    ];

    const calls = mockFetchSequence([
      // getDefaultBranchSha: repo info
      { status: 200, body: { default_branch: "main" } },
      // getDefaultBranchSha: ref
      { status: 200, body: { object: { sha: "mainsha" } } },
      // ensureBranch: getBranchSha (404 → create)
      { status: 404, body: { message: "Not Found" } },
      // ensureBranch: create branch
      { status: 201, body: { ref: "refs/heads/docs/owner-repo" } },
      // commitFilesToBranch: getBranchSha
      { status: 200, body: { object: { sha: "branchsha" } } },
      // commitFilesToBranch: get commit info
      { status: 200, body: { tree: { sha: "parenttree" } } },
      // commitFilesToBranch: create blob
      { status: 201, body: { sha: "blob1" } },
      // commitFilesToBranch: create tree
      { status: 201, body: { sha: "newtree" } },
      // commitFilesToBranch: create commit
      { status: 201, body: { sha: "newcommit" } },
      // commitFilesToBranch: update ref
      { status: 200, body: { ref: "refs/heads/docs/owner-repo" } },
      // check for existing PRs
      { status: 200, body: [] },
      // create PR
      { status: 201, body: { number: 7, html_url: "https://github.com/test/pr/7" } },
    ]);

    const result = await createDocumentationPullRequest("owner", "repo", files, { repo: TEST_REPO });

    expect(result.number).toBe(7);
    expect(result.url).toBe("https://github.com/test/pr/7");
    expect(result.branch).toBe("docs/owner-repo");
    expect(result.commitSha).toBe("newcommit");
    // Verify the PR creation call was the last one
    const prCall = calls.find((c) => c.url.includes("/pulls") && c.options.method === "POST");
    expect(prCall).toBeDefined();
  });

  it("returns existing PR if one is already open for the branch", async () => {
    const files: GitHubFile[] = [
      { path: "content/extensions/owner/repo.ts", content: "export const x = 1;" },
    ];

    mockFetchSequence([
      // getDefaultBranchSha: repo info
      { status: 200, body: { default_branch: "main" } },
      // getDefaultBranchSha: ref
      { status: 200, body: { object: { sha: "mainsha" } } },
      // ensureBranch: branch already exists
      { status: 200, body: { object: { sha: "existingsha" } } },
      // commitFilesToBranch: getBranchSha
      { status: 200, body: { object: { sha: "existingsha" } } },
      // commitFilesToBranch: get commit info
      { status: 200, body: { tree: { sha: "parenttree" } } },
      // commitFilesToBranch: create blob
      { status: 201, body: { sha: "blob1" } },
      // commitFilesToBranch: create tree
      { status: 201, body: { sha: "newtree" } },
      // commitFilesToBranch: create commit
      { status: 201, body: { sha: "newcommit" } },
      // commitFilesToBranch: update ref
      { status: 200, body: { ref: "refs/heads/docs/owner-repo" } },
      // check for existing PRs — found one
      { status: 200, body: [{ number: 99, html_url: "https://github.com/test/pr/99", state: "open" }] },
    ]);

    const result = await createDocumentationPullRequest("owner", "repo", files, { repo: TEST_REPO });

    expect(result.number).toBe(99);
    expect(result.url).toBe("https://github.com/test/pr/99");
  });
});
