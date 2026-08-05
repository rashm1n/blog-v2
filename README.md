# blog

Personal site — technical writing, travel notes, and (eventually) photos. Built with
[Astro](https://astro.build) + Tailwind v4, deployed as a Docker container behind Caddy
on a Hetzner VPS via GitHub Actions.

## Stack

- **Astro 7** — static output, content collections (`posts`, `travel`)
- **Tailwind v4** via `@tailwindcss/vite`
- **shadcn/ui** for the design system — rendered at build time, ships no JS (see below)
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
| `pnpm build`                | Build production site to `./dist/` (runs Pagefind + CSP check as postbuild) |
| `pnpm preview`             | Preview the production build locally             |
| `pnpm astro check`         | Type-check the project                           |
| `pnpm check:csp`           | Verify every inline script is covered by the CSP |

## Content

- `src/content/posts/` — technical writing
- `src/content/travel/` — travel notes (empty for now, wired up and ready)
- Frontmatter: `title`, `description`, `pubDate`, optional `updatedDate`, `tags`, `draft`, optional `heroImage`

### Authoring extras

**Callouts.** GitHub's blockquote syntax, so a post still reads correctly as plain Markdown
on GitHub and in the `/blog/<slug>.md` twins. Types: `NOTE`, `TIP`, `IMPORTANT`, `WARNING`,
`CAUTION`. Anything after the marker on the same line replaces the default title; an
unrecognised type is left as an ordinary blockquote.

```markdown
> [!WARNING] This is optional
> Body text, **formatting** and [links](https://example.com) all work.
```

**Image captions.** The Markdown image *title* (the quoted third argument) becomes a visible
caption. `alt` stays alt — it describes the image for screen readers and is not displayed.

```markdown
![Alt text for screen readers](./shot.png 'Caption shown under the image.')
```

Every image in a post is click-to-zoom, opening in a lightbox. Nothing to add per image.

**External links** in post content automatically get `rel="noopener noreferrer"`,
`target="_blank"` and a small ↗ marker.

## shadcn/ui

Components are vendored into `src/components/ui/` by the shadcn CLI (`pnpm dlx shadcn@latest
add <name>`), configured by `components.json`. They are React, so `@astrojs/react` is an
integration — but **nothing is given a `client:` directive**, so Astro renders them to static
HTML at build time and no page references the React bundle. Adding a `client:` directive to
any one of them is what would start shipping JavaScript.

Two things that will bite you, both covered in more depth in
[`planning/visual-design.md`](./planning/visual-design.md):

- **React context doesn't cross the Astro slot boundary.** Astro renders each child of a React
  component as its own React root, so composing a Radix primitive's parts in a `.astro`
  file (`<Avatar><AvatarFallback/></Avatar>`) fails the build. Wrap the whole subtree in one
  `.tsx` file instead — see `src/components/AuthorAvatar.tsx`.
- **A variant-prefixed utility beats an unprefixed one.** Overriding a component's
  `data-[size=lg]:size-10` needs `data-[size=lg]:size-14`, not `size-14`. This one fails
  silently.

For links and other non-`<button>` elements, use the `cva` variant functions
(`buttonVariants({ … })`, `badgeVariants({ … })`) as a class string on a plain `<a>` rather
than the component with `asChild`.

## Security headers

The policy is split across two files, and they are meant to be read together:

- **`astro.config.mjs` (`security.csp`)** generates the `script-src` / `style-src` /
  `img-src` policy per page and emits it as a `<meta http-equiv>`. It has to live there
  because only the build knows the SHA-256 of each page's inline scripts.
- **`deploy/Caddyfile`** carries what a `<meta>` element cannot express — `frame-ancestors`,
  HSTS, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `X-Content-Type-Options`.

Astro hashes the scripts it bundles, but **not** `is:inline` ones. Exactly one inline script
remains — the theme anti-flash script in `BaseHead.astro`, which must run before first paint —
and its hash is pinned by hand in `security.csp.scriptDirective.hashes`.

`pnpm check:csp` (run automatically in `postbuild`) walks the built HTML and fails if any
inline script's hash is missing from that page's policy, printing the value to paste in. Without
it, editing an inline script by one character silently breaks that feature in every browser
that enforces the policy — with no error anywhere, since the site sets no `report-uri`.

Prefer a bundled `<script>` over `is:inline` unless the script genuinely must run before
paint; bundled scripts are hashed automatically and need no maintenance.

**Third-party resources have to be added by hand.** giscus needs `https://giscus.app` in both
`script-src` and `style-src` (its `client.js` injects a stylesheet into *this* document, not
just its iframe) and in `frame-src`. Nothing warns you: the `GISCUS_*` build variables are
unset in dev, so the component renders a placeholder locally and the violation only appears in
production. **After any CSP change, load a real post in a browser and read the console** — a
blocked resource is silent everywhere else.

## Deployment

See `Dockerfile` and `docker/site.Caddyfile` for the app container, and `deploy/` for the
VPS-side `docker-compose.yml` and edge `Caddyfile` (Caddy + blog + Umami + Postgres).
`.github/workflows/deploy.yml` builds and pushes to GHCR, then SSHes into the VPS.

### The deploy key runs a forced command — read this before editing the workflow

The CI key is registered in the VPS's `~/.ssh/authorized_keys` as:

```
restrict,command="/home/rush/bin/gh-deploy.sh" ssh-ed25519 AAAA...
```

so **sshd ignores whatever command the workflow sends and runs that script instead**, putting
the sent command in `$SSH_ORIGINAL_COMMAND`. The key can do nothing else — no interactive
shell, no arbitrary commands — which is a good property worth keeping.

The consequence: **the real deploy logic is `deploy/gh-deploy.sh`, not the workflow.** Editing
the workflow's `script:` block changes nothing in production. This went unnoticed for a long
time because the workflow's script happened to be character-for-character what the forced
command does, so deploys looked like they were running it.

`deploy/gh-deploy.sh` is the version-controlled copy. Changing it requires a human on the box:

```
install -m 700 deploy/gh-deploy.sh /home/rush/bin/gh-deploy.sh
```

The workflow now sends only the commit SHA; `gh-deploy.sh` accepts it only if it matches
exactly 40 hex characters (falling back to `main`) and uses it to fetch the matching
`deploy/Caddyfile`, validate it in a throwaway `caddy` container, and reload — so edge-config
changes reach production the same way app changes do.

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
4. Set repo secrets: `VPS_HOST`, `VPS_USER`, `SSH_PRIVATE_KEY` (deploy-only key). **The
   `deploy` job will fail silently-ish with `error: missing server host` until all three
   exist** — `gh secret list` returns empty with no error if they were never set, so this
   is easy to miss; the `build-and-push` job can go green for a long time while `deploy`
   quietly fails every run. Generate the key pair on the VPS itself (`ssh-keygen -t
   ed25519 -f ~/.ssh/gh_deploy -N ""`), append `gh_deploy.pub` to that user's
   `~/.ssh/authorized_keys`, then push the private key as the `SSH_PRIVATE_KEY` secret
   (`gh secret set SSH_PRIVATE_KEY < ~/.ssh/gh_deploy`).
5. Optionally set repo variables for comments/analytics (see `.env.example`).
6. On the VPS: copy `deploy/docker-compose.yml`, `deploy/Caddyfile`, and a `deploy/.env`
   (from `deploy/.env.example`) into `/srv/blog/`, then `docker compose up -d`.

### CI gotcha: buildx cache driver

`docker/build-push-action` with `cache-to: type=gha` requires the `docker-container`
buildx driver. The buildx builder pre-installed on `ubuntu-24.04` GitHub-hosted runners
now defaults to the plain `docker` driver, which doesn't support GHA cache export and
fails with `Cache export is not supported for the docker driver.` Add a
`docker/setup-buildx-action@v3` step before the build step to fix it — see
`.github/workflows/deploy.yml`.
