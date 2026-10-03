This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy

The site deploys to Netlify. From the **repo root** (not this directory):

```bash
npm run deploy:web            # Netlify rebuilds it, deploys to production
npm run deploy:web:preview    # same, but to a draft URL
npm run deploy:web:local      # build on this machine and upload
```

Netlify builds it by default, which is the normal production path: it deploys the
last **pushed** commit, so the script prints any unpushed commits and uncommitted
files before starting rather than letting you assume a local edit went live.

`--local` builds here instead. It cannot work from a checkout inside OneDrive —
Netlify's Next.js plugin finishes by renaming `web/.next`, OneDrive's sync client
blocks that with `EPERM`, and it surfaces minutes later as the unhelpful
"Failed publishing static content". The script refuses `--local` up front when it
detects OneDrive; use it only from a checkout outside OneDrive.

One-time setup on a new machine:

```bash
npm i -g netlify-cli   # the CLI itself; not a dependency of this repo
npx netlify login      # opens a browser
npx netlify link       # pick the project serving the marketing pages
```

The default path also needs the project connected to Git in the Netlify UI
(*Project settings → Git*), otherwise Netlify has nothing to rebuild from.

`node scripts/deploy-web.mjs --help` lists the flags. The deploy message defaults
to the current git SHA and subject; pass `--message "..."` to override it.

### Env vars

Build-time values live in the Netlify UI (or `npx netlify env:set`), not in this
repo — `.env.example` lists them. Note that `next build` loads `.env.local`
locally, so values in `web/.env.local` override the Netlify UI for local deploys
only. The deploy script warns when that file is present.

## Deploy on Vercel

Vercel is also supported and needs no extra config — it is detected via
`VERCEL=1` in `next.config.ts`. Netlify is the deployment this repo is set up
for; see the Deploy section above.

If you do want Vercel, import the repo at [vercel.com/new](https://vercel.com/new) and set the root directory to `web` — `next.config.ts` already handles the platform differences.

Check out our [Next.js deployment documentation](https://nextjs.org/docs) for the framework-agnostic version of all this.
