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

TLS is **not** handled by Let's Encrypt/ACME — the edge Caddyfile loads a static certificate
from `/certs` instead (see the `tls` directive on each site block). This is a deliberate choice
for a domain proxied through Cloudflare: repeatedly bringing the stack up before DNS existed
burns Let's Encrypt's per-domain rate limit fast (see `planning/implementation-log.md`, Phase
9/10 for what that looked like in practice), and a Cloudflare-proxied domain never needs a
publicly-trusted cert at the origin anyway — only Cloudflare talks to it directly. Cloudflare's
SSL/TLS mode is set to **Full (strict)**.

Before the first deploy:

1. Register the domain and update `astro.config.mjs` (`site`), `src/consts.ts`
   (`SITE_URL`), and `public/robots.txt` to match.
2. Point DNS at the VPS through Cloudflare (proxied/orange-cloud), for the apex, `www`, and
   `analytics` subdomains — do this *before* first bringing the stack up, not after.
3. Generate an origin TLS cert: on the VPS, `openssl ecparam -genkey -name prime256v1 -noout
   -out origin-key.pem`, then a CSR with SAN `<domain>` + `*.<domain>`. Submit the CSR via
   Cloudflare dashboard → SSL/TLS → Origin Server → Create Certificate → "Use my private key
   and CSR". Save the returned certificate as `origin.pem`. Neither file is committed — put
   both in `/srv/blog/certs/` (`chmod 600` the key), which `deploy/docker-compose.yml` mounts
   into the `caddy` service at `/certs`. Only switch Cloudflare to Full (strict) after
   confirming the origin serves this cert (`curl --resolve <domain>:443:127.0.0.1 ...`) —
   switching first, before the origin is ready, takes the live site down.
4. Set repo secrets: `VPS_HOST`, `VPS_USER`, `SSH_PRIVATE_KEY` (deploy-only key).
5. Optionally set repo variables for comments/analytics (see `.env.example`).
6. On the VPS: copy `deploy/docker-compose.yml`, `deploy/Caddyfile`, and a `deploy/.env`
   (from `deploy/.env.example`) into `/srv/blog/`, then `docker compose up -d`.
