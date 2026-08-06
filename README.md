# MakeCode Games

MakeCode Games brings forward and organizes games created by the [MakeCode Arcade](https://arcade.makecode.com) community. Games are ingested from the MakeCode forums, indexed for search, and presented here so they're easier to browse and discover. Be sure to visit the forums to comment on games and leave reactions.

This project is not developed, affiliated with, or endorsed by Microsoft, the owner of MakeCode Arcade.

## Tech stack

- [Next.js](https://nextjs.org) (App Router)
- [Supabase](https://supabase.com) for the database and auth
- [Algolia](https://www.algolia.com) for search
- [Tailwind CSS](https://tailwindcss.com)
- [Vitest](https://vitest.dev) + Testing Library for tests

## Getting started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the environment example and fill in your own values:

   ```bash
   cp .env.local.example .env.local
   ```

   You'll need a Supabase project (URL, service role key, anon key) and an Algolia application (app ID, search key, write key). See `.env.local.example` for the full list of variables.

3. Apply the database schema/migrations in `supabase/migrations` to your Supabase project.

4. Run the development server:

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the result.

## Scripts

- `pnpm dev` – start the development server
- `pnpm build` – build for production
- `pnpm start` – run the production build
- `pnpm lint` – run ESLint
- `pnpm test` – run the test suite with Vitest

The `scripts/` directory also contains one-off maintenance scripts (e.g. `backfill-forum-posts.ts`, `setup-algolia.ts`), and `workflows/ingest.ts` powers the recurring ingest of forum jams/games into Supabase and Algolia.

## Contributing

Issues and pull requests are welcome. Before opening a PR:

- Run `pnpm lint` and `pnpm test` and make sure both pass.
- Keep changes focused and include tests for new behavior where practical.

## Deploying

This app is built to deploy on [Vercel](https://vercel.com), but any host that supports Next.js should work. Make sure the environment variables listed in `.env.local.example` are configured for the deployment target, and that CI has access to a `SUPABASE_PROJECT_ID` variable and the Supabase secrets needed to apply migrations (see `.github/workflows/apply-schema.yml`).

## License

[MIT](LICENSE)
