# blog

Personal site — technical writing, travel notes, and (eventually) photos. Built with
[Astro](https://astro.build) + Tailwind v4, deployed as a Docker container behind Caddy
on a Hetzner VPS via GitHub Actions.

## Stack

- **Astro 7** — static output, content collections (`posts`, `travel`)
- **Tailwind v4** via `@tailwindcss/vite`
- **Pagefind** for static search (⌘K)
- **Satori** for build-time OG image generation
- **giscus** for comments (GitHub Discussions-backed)
- **Umami** for self-hosted analytics
- **Caddy** as edge TLS terminator + static file server
- **GitHub Actions** for CI and deploy

## Commands

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `pnpm install`             | Install dependencies                             |
| `pnpm dev`                 | Start local dev server at `localhost:4321`       |
| `pnpm build`                | Build production site to `./dist/` (runs Pagefind postbuild) |
| `pnpm preview`             | Preview the production build locally             |
| `pnpm astro check`         | Type-check the project                           |

## Content

- `src/content/posts/` — technical writing
- `src/content/travel/` — travel notes (empty for now, wired up and ready)
- Frontmatter: `title`, `description`, `pubDate`, optional `updatedDate`, `tags`, `draft`, optional `heroImage`

## Deployment

See `Dockerfile` and `docker/site.Caddyfile` for the app container, and `deploy/` for the
VPS-side `docker-compose.yml` and edge `Caddyfile` (Caddy + blog + Umami + Postgres).
`.github/workflows/deploy.yml` builds and pushes to GHCR, then SSHes into the VPS to pull
and restart just the `blog` service.

Before the first deploy:

1. Register the domain and update `astro.config.mjs` (`site`), `src/consts.ts`
   (`SITE_URL`), and `public/robots.txt` — all currently `example.com` placeholders.
2. Set repo secrets: `VPS_HOST`, `VPS_USER`, `SSH_PRIVATE_KEY` (deploy-only key).
3. Optionally set repo variables for comments/analytics (see `.env.example`).
4. On the VPS: copy `deploy/docker-compose.yml`, `deploy/Caddyfile`, and a `deploy/.env`
   (from `deploy/.env.example`) into `/srv/blog/`, then `docker compose up -d`.
