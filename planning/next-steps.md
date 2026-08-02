# Next steps

What's left before this goes live, roughly in the order it needs to happen. Steps 1–4 and 6
haven't been started — all deliberately deferred per the decisions in
[`decisions.md`](./decisions.md). Step 5 is partially done; see the note there.

## 1. Domain

- Register the domain.
- Point DNS at the Hetzner VPS: `A @ → <IPv4>`, `AAAA @ → <IPv6>`, `CNAME www → @`.
- Let DNS propagate *before* first boot of the edge Caddy — a failed ACME challenge burns
  Let's Encrypt's rate limit.
- Replace every `example.com` placeholder: `astro.config.mjs` (`site`), `src/consts.ts`
  (`SITE_URL`), `public/robots.txt`. Note that the OG social cards now print the domain in
  their footer, so it's user-visible, not just metadata — it reads from `SITE_URL`, so the
  `consts.ts` edit covers it, but re-check a generated card afterwards.
- Phase 8 added three more user-visible surfaces that bake the domain into their *bodies*, not
  just into metadata: the JSON-LD `@id`s and URLs, `/llms.txt` and `/llms-full.txt`, and the
  `Canonical URL:` line in every `/blog/<slug>.md`. All derive from the same two constants, so
  the swap is still mechanical — but `curl` the built `/llms.txt` afterwards to confirm, since
  a stale `example.com` there would be handed straight to an LLM as fact.

## 2. GitHub repo

- `gh repo create` (public — required for giscus and for a credential-free GHCR pull on the VPS).
- `git remote add origin ...` + `git push -u origin main`.
- Enable Discussions, create a `Comments` category, install the giscus GitHub App, configure
  giscus at giscus.app, set `GISCUS_*` repo variables.
- Set repo secrets: `VPS_HOST`, `VPS_USER`, `SSH_PRIVATE_KEY` (a deploy-only keypair, not a
  personal key).
- Set repo variables: `UMAMI_WEBSITE_ID`, `UMAMI_SCRIPT_URL` (once Umami is running, step 4).

## 3. VPS prep

- Non-root `deploy` user, SSH key-only auth, `PasswordAuthentication no`, root login disabled.
- `ufw`: allow 22, 80, 443; deny the rest.
- fail2ban on sshd.
- Docker Engine + Compose plugin; add `deploy` to the `docker` group.
- Run `uname -m` — if it says `aarch64` (Hetzner CAX instances are ARM64), change both
  `runs-on` values in `.github/workflows/deploy.yml` to `ubuntu-24.04-arm` before the first
  deploy, or the pushed image won't run.
- `/srv/blog/` owned by `deploy`, holding `docker-compose.yml`, `Caddyfile`, and `.env` (from
  `deploy/.env.example`, `chmod 600`, never committed).

## 4. First deploy

- `docker compose up -d` on the VPS.
- Confirm valid TLS on the apex domain, `www` redirect works.
- Umami reachable at `analytics.<domain>` — change the default `admin`/`umami` login
  immediately.
- Push a trivial commit to `main` and confirm the GitHub Actions deploy workflow reaches the
  live domain unattended.

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
