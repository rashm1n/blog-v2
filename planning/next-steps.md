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

**Mostly done.** Verified against the live repo in Phase 11:

- ~~`gh repo create`, remote, first push.~~ Done — `github.com/rashm1n/blog-v2`, public.
- ~~Discussions, giscus app, `GISCUS_*` repo variables.~~ Done — all four variables are set
  (`gh variable list`) and a giscus iframe renders on live post pages.
- ~~Repo secrets `VPS_HOST` / `VPS_USER` / `SSH_PRIVATE_KEY`.~~ Done — deploys run green
  end-to-end, which they couldn't without all three.
- **`UMAMI_WEBSITE_ID` is still unset, so the blog reports nothing.** This is the one item
  here that is genuinely outstanding, and it looks fine from every angle except the one that
  matters: the Umami container is up, `analytics.rashmin.dev` resolves, and
  `https://rashmin.dev/stats.js` returns `200 application/javascript` — but `BaseHead` only
  emits the tracking tag when `UMAMI_WEBSITE_ID` is non-empty, and no such repo variable
  exists. Live pages contain no `data-website-id` script at all.

  To fix: log in to `analytics.rashmin.dev`, add the site, copy its website ID, then
  `gh variable set UMAMI_WEBSITE_ID --body '<id>'` and redeploy. `UMAMI_SCRIPT_URL` can stay
  unset — it defaults to `/stats.js`, which is already proxied correctly.

  Note the default `admin`/`umami` login still hasn't been changed (see step 4), so that
  wants doing first, in the same sitting.

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

**Mostly closed in Phase 11.** A headless Chromium is now driveable from the dev environment,
so the "screenshot-only, no input events" limitation this section was written around is gone.
Done — see the Phase 11 verification list in [`implementation-log.md`](./implementation-log.md):

- ~~Responsive / overflow~~ — `scrollWidth === clientWidth` asserted at 390px on every page,
  measured rather than eyeballed, plus 1280px in both themes.
- ~~Keyboard pass and focus management~~ — ⌘K, arrows, `↵`, `esc`, and a focus-trap assertion
  (Tab twelve times, focus never leaves the dialog; returns to the trigger on close).
- ~~Dark-mode toggle interaction~~ — click path and the `localStorage` round-trip exercised.
- ~~Code-block copy button~~ — exercised over `localhost` (a secure context).
- ~~`/blog/<slug>.md` content type~~ — confirmed on the live site:
  `content-type: text/plain; charset=utf-8`. The Caddy rule works.

Still open, and all of it needs either a human eye or a third-party service:

- **Lighthouse on a live post** — target 100/100/100/100. Nothing measured performance this
  session; the new work is close to free (the only added JS is the lightbox and share
  handlers, and view transitions ship zero bytes), but "should be fine" is not a number.
- **Social preview** — paste a post URL into the X and LinkedIn debuggers. The OG images
  generate and were inspected, but no crawler has fetched one.
- **`/rss.xml` through the W3C feed validator**, now that it carries full `<content:encoded>`
  rather than summaries — worth re-checking specifically because that changed.
- **Rich Results Test + Schema.org validator** on a live post URL.
- **Hover states** — exercised implicitly but not reviewed by eye at every breakpoint.

## 6. Content

The three sample posts are already gone; `src/content/posts/` holds one real post (Omarchy).
`sample-hero.png` is still in `src/assets/posts/` but is no longer referenced by anything and
can be deleted.

**This is now the binding constraint on the site, and it's the only one.** Everything
structural is done — search, feeds, comments, analytics plumbing, OG cards, archive, tags,
related posts. A first-time visitor lands on a homepage with a single entry under "Writing".
[`growth.md`](./growth.md) carries the post ideas; nothing in the codebase is blocking any of
them, and no code change is needed to publish.

## Deferred by choice, not blocking

- `/photos` gallery — route stubbed, no image pipeline decided yet.
- Travel posts — collection and routes are already live, just empty; adding a post needs zero
  code changes.
