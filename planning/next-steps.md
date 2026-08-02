# Next steps

What's left before this goes live, roughly in the order it needs to happen. Steps 1 and 4 are
done. Step 3 is partially done as of Phase 9 (see
[`implementation-log.md`](./implementation-log.md#phase-9--first-vps-deploy)) — done ahead of
schedule and deviating from the plan below. Steps 2 and 6 haven't been started. Step 5 is
partially done; see the note there.

## 1. Domain

- ~~Register the domain.~~ Done — `rashmin.dev`.
- ~~Point DNS at the Hetzner VPS.~~ Done in Phase 10 — `A`/`AAAA` for apex, `www`, and
  `analytics`, added via Cloudflare, **proxied** (not DNS-only). Note this was done *after*
  first bringing the stack up (Phase 9), not before — exactly the "burns Let's Encrypt's rate
  limit" scenario this doc originally warned about, and it did happen (Caddy hit `HTTP 429` on
  the first real attempt, self-recovered ~3 minutes later once the window passed). Do DNS
  *before* first boot on any future fresh deploy.
- **TLS no longer depends on Let's Encrypt at all.** Phase 10 replaced Caddy's automatic
  HTTPS/ACME with a static **Cloudflare Origin CA** certificate
  (`/srv/blog/certs/origin.pem` + `origin-key.pem`, 15-year validity, `deploy/Caddyfile`'s
  `tls` directive), and Cloudflare's SSL/TLS mode is set to **Full (strict)**. This means the
  rate-limit failure mode above can't recur for this domain — worth keeping if this deploy is
  ever repeated elsewhere. The private key was generated on the VPS and never left it; only a
  CSR went out, only a signed cert came back.
- ~~Replace every `example.com` placeholder~~ Done in Phase 9: `astro.config.mjs` (`site`),
  `src/consts.ts` (`SITE_URL`), `public/robots.txt`. Re-check a generated OG card and the built
  `/llms.txt` now that the site is live over HTTPS — swapped mechanically, not yet re-verified
  against a live build.

## 2. GitHub repo

- `gh repo create` (public — required for giscus and for a credential-free GHCR pull on the VPS).
- `git remote add origin ...` + `git push -u origin main`.
- Enable Discussions, create a `Comments` category, install the giscus GitHub App, configure
  giscus at giscus.app, set `GISCUS_*` repo variables.
- Set repo secrets: `VPS_HOST`, `VPS_USER`, `SSH_PRIVATE_KEY` (a deploy-only keypair, not a
  personal key).
- Set repo variables: `UMAMI_WEBSITE_ID`, `UMAMI_SCRIPT_URL` (once Umami is running, step 4).

## 3. VPS prep

- **Still open — deviated from plan in Phase 9, not completed as designed.** Docker Engine +
  Compose plugin are installed, but everything else here is either done differently or not
  done:
  - No dedicated `deploy` user — Docker and `/srv/blog/` (`docker-compose.yml`, `Caddyfile`,
    `.env`, `chmod 600`) run under the existing `rush` account instead.
  - `rush` was added to the `docker` group, but the running shell never picked it up (group
    membership needs a fresh login this session couldn't force). Worked around with a scoped
    `NOPASSWD` sudoers rule for `/usr/bin/docker` only (`/etc/sudoers.d/rush-docker`) — narrower
    than full docker-group access, but still a deviation worth revisiting with a real re-login.
  - `ufw`, `fail2ban`, `PasswordAuthentication no`, root login disabled — none of this was
    touched.
  - `uname -m` confirmed `x86_64`, so `.github/workflows/deploy.yml`'s `runs-on` values are
    already correct as-is; no change needed there.

## 4. First deploy

- `docker compose up -d` on the VPS — done (Phase 9), but from a locally-built image
  (`docker build` run directly on the VPS), not a GHCR pull, since no CI run has ever happened.
- ~~TLS not valid yet~~ Resolved in Phase 10 — valid Cloudflare Origin CA cert served at the
  origin, `Full (strict)` confirmed working end-to-end for `rashmin.dev`, `www.rashmin.dev`,
  and `analytics.rashmin.dev`.
- Umami container is up and reachable at `analytics.rashmin.dev` now, but the default
  `admin`/`umami` login still hasn't been changed — do this next, nothing is blocking it
  anymore.
- CI-triggered deploy **not yet attempted** — no GitHub remote push has happened since the
  original `git init`, so the GitHub Actions workflow has never run once, let alone against
  this VPS.

## 5. Manual QA

Phase 7 covered part of this with screenshots from Windows Chrome — 1280px and 1700px in both
themes, 375px measured for overflow, and search exercised against a built index. That bridge is
screenshot-only (no CDP from WSL), so anything needing input, hover or focus is still open:

- Responsive check at 768 / 1440px — no horizontal scroll on tables, code blocks, images.
  (375px and 1280px+ verified; see the implementation log, and note that Chrome clamps
  `--window-size` to 500px minimum, so screenshots below that width lie.)
- Hover and focus states across nav, post rows, tag chips, ToC, prev/next cards.
- Keyboard-only pass: nav → search (`⌘K`, arrows, `↵`, `esc`) → post → comments, visible focus
  rings, `prefers-reduced-motion` honored.
- Dark mode: click the toggle, hard-reload, confirm no flash of the wrong theme.
- Code-block copy button — needs a secure context, so test over HTTPS or `localhost`, not a
  LAN IP.
- Lighthouse on a built post — target 100/100/100/100, investigate anything under 95.
- Social preview: paste a post URL into the X and LinkedIn debuggers, confirm the OG image.
- `/rss.xml` through the W3C feed validator.
- A post URL through Google's Rich Results Test and the Schema.org validator. The graph was
  read and checked by hand against the built HTML (see the implementation log), but neither
  validator has seen it, and Rich Results needs a public URL.
- `curl -I` a `/blog/<slug>.md` on the live site and confirm `Content-Type: text/plain`. The
  Caddy rule that pins this is in `docker/site.Caddyfile` and has never run — Docker isn't
  installed in the dev environment, so it's unverified like the rest of the container config.
  If it silently fails, browsers will download the file instead of rendering it.

## 6. Content

- Replace the placeholder gradient hero image (`src/assets/posts/sample-hero.png`) on
  "Setting up this blog" with a real image, or remove the `heroImage` frontmatter.
- Decide whether the 3 sample posts stay, get rewritten, or get deleted once real posts exist.
  [`growth.md`](./growth.md) argues this is blocking rather than optional — "Setting up this
  blog" is the most-written post on the internet and reads as *nothing here yet* to a first-time
  visitor. That file also carries a list of post ideas to replace them with.

## Deferred by choice, not blocking

- `/photos` gallery — route stubbed, no image pipeline decided yet.
- Travel posts — collection and routes are already live, just empty; adding a post needs zero
  code changes.
