<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:supabase-scope-guardrail -->
## Supabase scope guardrail

All `supabase` CLI, SQL, and migration work in this repo must target only the `MakecodeGames` project (its ref is set via the `SUPABASE_PROJECT_ID` env var / GitHub repository variable). Do not link, query, or push to any other Supabase project or shared database.
<!-- END:supabase-scope-guardrail -->

<!-- BEGIN:loading-state-convention -->
## Loading states for async server components

For any async server component / route segment that awaits slow data, add a sibling `loading.tsx` file (Next.js App Router Suspense convention) rather than inventing a custom client-side spinner or loading-state pattern. This gives you instant fallback UI during both SSR streaming and client-side navigations. See `app/games/loading.tsx` and `app/games/components/ArcadeLoader.tsx` for the reference implementation.
<!-- END:loading-state-convention -->
