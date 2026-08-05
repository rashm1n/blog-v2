# Implementation log

Chronological record of what was built and the bugs hit along the way. See
[`decisions.md`](./decisions.md) for the *why* behind the choices; this file is the *what
went wrong and how it was resolved*.

## Stack version drift: Astro 6 → 7

The original plan was written against Astro 6 (released March 2026). By the time
`pnpm create astro@latest` actually ran, Astro 7 had shipped (June 2026, v7.1.6) with a new
Rust-based markdown processor ("Sätteri") replacing the remark/rehype pipeline, Vite 8, and a
few import-path changes. Implementation was adjusted on the fly against Astro 7's actual
behavior rather than blindly following the Astro-6-era plan — e.g., `remark-gfm` is no longer
needed since Sätteri has built-in GFM tables/footnotes/smartypants/heading-IDs.

## Phase 1 — Scaffold and design system

- `create-astro` refuses to scaffold into a non-empty directory. `/home/rashmin/blog` already
  had a `.claude/` dir. Fixed by scaffolding into a scratch temp dir, then copying files over
  while preserving `.claude/`.
- Circular CSS variable: the Astro Fonts API was initially configured with
  `cssVariable: '--font-sans'`, which collided with Tailwind's own `@theme --font-sans` token,
  producing a self-referential `var(--font-sans)`. Fixed by naming the Fonts API variables
  `--font-face-sans` / `--font-face-mono`, with the Tailwind theme referencing those instead.
- `astro check` failed under TypeScript 7.0 ("does not expose the programmatic API that
  `astro check` relies on") — the native/Go TS compiler doesn't yet support the API
  `@astrojs/check` needs. Fixed by pinning `typescript@^6` (resolved to 6.0.3) as an explicit
  devDependency, overriding the 7.0.2 that `@astrojs/check` pulled by default.

## Phase 2 — Content layer and post rendering

- `defineCollection is not a function` — the plan (written for an earlier API shape) said to
  import both `defineCollection` and `z` from `astro/zod`. Actually only `z` lives there;
  `defineCollection` is still exported from `astro:content`.
- Missing `sharp` — build failed with a `MissingSharp` error when generating optimized images
  via `astro:assets`. Fixed by adding `sharp` as a devDependency (it's a peer requirement, not
  bundled).
- New content collection files didn't render (404s) until `astro dev stop` + restart — a content
  config change seems to require a fresh sync rather than picking it up via HMR.

## Phase 3 — Search, OG images, feeds, comments, analytics

- OG image font loading: `readFileSync(fileURLToPath(new URL('../../assets/fonts/...',
  import.meta.url)))` failed at build time with `ENOENT`, because Vite's bundled chunk output
  location differs from the source file's location. Fixed by resolving fonts from
  `path.join(process.cwd(), 'src/assets/fonts/...')` instead, which is stable regardless of
  where Vite places the bundle.
- Satori needs real TTF font buffers, not woff2. Fontsource's npm packages only ship woff2, so
  Geist (the body/UI font) couldn't be reused for OG images. Downloaded genuine JetBrains Mono
  `.ttf` files directly from the official JetBrains GitHub repo (SIL OFL licensed) and used
  those for OG card rendering instead.
- `TS: Buffer not assignable to BodyInit` — `resvg`'s `asPng()` returns a Node `Buffer`, which
  the Astro endpoint's `Response` constructor doesn't accept directly. Fixed with
  `new Response(new Uint8Array(png), {...})`.
- Pagefind dynamic import broke the dev server with a hard Vite transform error (not just a
  warning): `[UNRESOLVED_IMPORT] Failed to resolve import "/pagefind/pagefind.js"`. Root cause:
  Vite 8's import analyzer still statically resolves a dynamic `import()` call when its argument
  is a *literal string*, even with a `/* @vite-ignore */` comment — the comment only suppresses
  the "cannot be analyzed" *warning*, it doesn't stop resolution of an analyzable (literal)
  specifier. Since `dist/pagefind/pagefind.js` only exists after the Pagefind postbuild step,
  dev mode (which never runs that step) hard-failed on every page load. Fixed by routing the
  specifier through a variable (`const pagefindUrl = '/pagefind/...'; import(pagefindUrl)`),
  on the assumption that a variable reference is unanalyzable to the lexer. The existing
  `try/catch` around it then did what it was always meant to: show a "Search is only available
  in the built site" fallback in dev, instead of crashing. (Caught after initial
  implementation, during the user's first `pnpm dev` run.)

  > **This fix was wrong and search was broken in production until Phase 7.** It resolved
  > the dev-mode crash, which is what was being tested, and the production failure mode
  > looked identical to the intended dev fallback — so nothing flagged it. See
  > "Pagefind, properly this time" below.
- No real image-generation tool available in this environment (no PIL, no ImageMagick). The
  sample post's hero image was produced by hand-writing a minimal PNG encoder in pure Python
  (`struct` + `zlib`) to generate a black-to-purple gradient placeholder — it's a working
  demonstration of hero-image support, not a real photo, and is expected to be swapped out.

## Phase 4 — Docker

Written but not locally verified — Docker isn't installed in the dev environment, and the
decision (see [decisions.md](./decisions.md)) was to defer `docker build`/`run` verification to
the VPS, which already has Docker installed.

## Phase 6 — GitHub Actions

CI and deploy workflow YAML written and structurally validated, but not run — no GitHub remote
exists yet. The deploy workflow's `runs-on` is set for an amd64 VPS with an inline comment
flagging that it must change to `ubuntu-24.04-arm` if the Hetzner box turns out to be a CAX
(ARM64) instance — check with `uname -m` on the VPS before the first real deploy.

## git

`git init` defaulted to a `master` branch; renamed to `main` via `git branch -m main` before the
first commit, to match what the CI/deploy workflows trigger on. First commit attempt failed with
"Author identity unknown" (no git config); fixed by setting local (repo-scoped, not `--global`)
`user.email`/`user.name`. First commit: `5bc53d4` — 55 files, 7246 insertions.

## Phase 7 — Visual design pass

The first six phases produced a site that worked but looked like default Tailwind. This phase
rebuilt the visual layer: palette, type scale, list rows, code-block chrome, sticky header,
command-palette search, ToC rail, reading progress, OG cards and favicon. The design system
and its reasoning are documented separately in [`visual-design.md`](./visual-design.md); this
section records what broke.

A headless browser *was* available this time (see "Screenshot setup" below), so the work was
reviewed visually in both themes rather than shipped on inspection alone. Three of the four
bugs below were found that way — none would have been caught by `astro check` or `pnpm build`,
both of which stayed green throughout.

### Pagefind, properly this time

Search threw on **every query in the built site**. The Phase 3 fix — routing the specifier
through a `const` — doesn't work: Vite constant-folds the variable, decides it *can* analyse
the import after all, rewrites the call through its preload helper, and emits

```js
i = await r(() => import(`/pagefind/pagefind.js`), __VITE_PRELOAD__)
```

where `__VITE_PRELOAD__` is left as a bare, undeclared identifier — because Vite has no
dependency graph for a file that won't exist until the postbuild step. Evaluating it throws
`ReferenceError`, which lands in the `try/catch` and renders "Search is only available in the
built site." In the built site. Every time.

Why it survived six phases: the failure is invisible without actually typing into the search
box on a *built* site, and when you do, the message reads like the intended dev-mode
fallback rather than an error.

Diagnosis: a scratch page in `dist/` that imported `/pagefind/pagefind.js` from a plain
`<script type="module">` and printed the outcome. That worked — import fine, `init()` fine,
one result for "deadlock" — which located the fault in the bundling, not in Pagefind. Grepping
the built HTML for `__VITE_PRELOAD__` then showed it directly.

Attempted and rejected: building the URL from `location.origin` so it's genuinely not
constant-foldable. Vite *still* wrapped it in the preload helper with the same unresolved
placeholder, so `@vite-ignore` is simply not being honoured on this path.

Actual fix: move the loader into a `<script is:inline>`, which Astro passes through to the
browser untouched — no bundler, no rewriting. It exposes `window.loadPagefind()` returning a
cached promise (cleared on rejection so a transient failure can retry); the bundled TypeScript
module calls that instead of importing directly. Verified against a real built site: query
"deadlock" returns the post, with `<mark>` highlighting.

### Ordered-list markers were invisible

`1.` / `2.` never rendered in prose. Tailwind Preflight resets `list-style` on all `ol`/`ul`,
and the original `.prose` rules only restored `padding-left`. Latent since Phase 1 — no sample
post used a numbered list until one did. Fixed with an explicit `list-style: decimal` on
`.prose ol`. (`.prose ul` intentionally keeps `list-style: none` and draws its own dash
bullets via `::before`.)

### The decorative grid was painted over

`body::before` at `z-index: -1` renders above the root element's background but below
`<body>`'s own, so the `bg-bg` utility on `<body>` hid the grid completely. Fixed by removing
the background from `<body>` and letting `<html>` own it, with a comment in `BaseLayout.astro`
so it doesn't get re-added.

### Empty chrome bar on unlabelled code blocks

Code fences with no language produced a bar with no label and a copy button that only appeared
on hover — i.e. an empty grey strip. Fixed by resting the copy button at 50% opacity instead of
0. Also aligned the bar's left padding to the `<pre>`'s so the language label lines up with the
code.

### Screenshot setup (and one false positive)

No Linux browser was installable — `playwright install chromium` needs `sudo` for system
libraries. Windows Chrome is reachable from WSL at
`/mnt/c/Program Files/Google/Chrome/Application/chrome.exe`, and can screenshot an
`astro preview --host 0.0.0.0` server via the WSL IP from `hostname -I`. Remote debugging
(CDP) could not be reached from WSL in either direction, so this is screenshot-only:
`--headless=new --force-device-scale-factor=2 --window-size=W,H --virtual-time-budget=N
--screenshot=<windows path>`. Dark mode was captured by first loading a throwaway page that
sets `localStorage.theme`, with `--user-data-dir` shared across invocations so the value
persists.

**The false positive worth remembering:** a `--window-size=375,1200` screenshot appeared to
show bad horizontal overflow on mobile. It doesn't. Chrome clamps its window to a **500px
minimum width** — a probe reported `innerWidth=500` — so the page laid out at 500px and the
screenshot canvas cropped it to 375. Testing 375px for real means loading the page in a
375px-wide `<iframe>` and comparing `documentElement.scrollWidth` to `clientWidth`. Done that
way: `scrollWidth === clientWidth`, no overflow, header collapses correctly, code blocks
scroll internally.

## Phase 8 — Structured data and Markdown twins

Two items pulled off the [`growth.md`](./growth.md) backlog: JSON-LD structured data, and
llms.txt plus raw-Markdown twins of every post. Rationale for both in
[`decisions.md`](./decisions.md#discoverability--machine-readability).

**New files**

- `src/utils/schema.ts` — `siteNodes()` (Person + WebSite, every page), `articleNodes()`
  (BlogPosting + BreadcrumbList, post pages), `jsonLdScript()` (serialiser).
- `src/utils/markdown.ts` — `postUrl()`, `markdownPath()`, `renderMarkdown()`, and the
  content-type constant.
- `src/pages/llms.txt.ts`, `src/pages/llms-full.txt.ts`.
- `src/pages/blog/[...slug].md.ts`, `src/pages/travel/[...slug].md.ts`.

**Modified**

- `src/utils/posts.ts` — extracted `wordCount()` out of `readingTime()` (the schema needs the
  raw count, the UI needs the minutes); added `sectionFor()` mapping a collection to its URL
  base and breadcrumb label, which had been implicit in three places.
- `src/components/BaseHead.astro` — optional `jsonLd` and `markdownPath` props, the ld+json
  script tag, and the `rel="alternate"` markdown link. Also normalised `Astro.site ?? SITE_URL`
  into a single `siteURL` URL object rather than re-deriving it per meta tag.
- `src/layouts/BaseLayout.astro` — forwards the two new props.
- `src/layouts/PostLayout.astro` — builds the article nodes.
- `docker/site.Caddyfile` — pins `*.md` and `*.txt` to `text/plain; charset=utf-8`.

### Things worth recording

**`</script>` in a post body would break out of the ld+json tag.** JSON-encoding alone doesn't
save you — `"</script>"` is valid JSON and the HTML parser doesn't care that it's inside a
string. `jsonLdScript()` rewrites every `<` into its Unicode escape form, which stays legal
JSON and is inert to the HTML parser. Worth being deliberate about on a blog whose posts
contain code.

**Breadcrumb URL didn't match the page it pointed at.** First pass emitted
`https://example.com/blog` for the "Writing" crumb while the blog index's own canonical is
`https://example.com/blog/`. Caught by reading the built output rather than by any tool. Fixed
by constructing it as `` new URL(`${section.path}/`, site) ``.

**Astro's sitemap ignores the new endpoints, which is the desired behaviour.** Confirmed
against the built `sitemap-0.xml`: 17 HTML routes, no `.md` or `.txt` entries. `llms.txt` and
the Markdown twins are for a different consumer and shouldn't be competing with the canonical
HTML in a search index.

**Empty-collection warnings are pre-existing.** The build prints `The collection "travel" does
not exist or is empty` once per route touching it. `llms.txt` and `llms-full.txt` add two more
instances. It's an Astro warning about the empty `travel` collection, not a fault in the new
routes, and it will disappear when the first travel post lands.

## Phase 9 — First VPS deploy

First real deploy, done live on the Hetzner VPS (Ubuntu 26.04, x86_64, IPv4 `77.42.80.2`).
Domain is `rashmin.dev`. Executed directly by Claude Code running *on* the VPS, not through
the GitHub Actions pipeline — no CI run has ever happened (no GitHub remote push since the
initial `git init`), so there was no GHCR image to pull yet.

**Domain placeholders** (`astro.config.mjs` `site`, `src/consts.ts` `SITE_URL`,
`public/robots.txt` sitemap line) replaced with `https://rashmin.dev`, per
[`next-steps.md`](./next-steps.md#1-domain). DNS itself was **not** pointed at the VPS before
this — see "Still open" below; the `next-steps.md` warning about burning Let's Encrypt's rate
limit on a failed challenge is exactly what happened on the first `docker compose up`, caught
after the fact rather than avoided.

**No `deploy` user, no `ufw`, no `fail2ban`.** `next-steps.md` step 3 called for a dedicated
non-root `deploy` user and host hardening; none of that happened here. Docker was installed
under the existing `rush` account, `/srv/blog` is owned by `rush`, and no firewall/fail2ban
setup was done. This was a scope call for "get it live now," not a decision that this is
sufficient — still open.

**Passwordless sudo for `docker` only, not the `docker` group.** `usermod -aG docker rush`
was run twice and the group membership genuinely landed in `/etc/group` both times, but the
shell Claude Code was operating in never picked it up — group membership is fixed at login,
and there was no way to force a fresh login on an already-running session. Rather than block
on that, a narrowly scoped `/etc/sudoers.d/rush-docker` grants `NOPASSWD` on `/usr/bin/docker`
specifically (validated with `visudo -c`), which is what CI/CD-adjacent automation actually
needs — nothing broader. A few one-off `sudo` calls outside that rule (`mkdir /srv/blog`,
`chown`) still needed the user to type a password interactively via `!`.

**Generated Postgres password broke Umami's DB connection string.** The first `.env` used
`openssl rand -base64 32` for `POSTGRES_PASSWORD`; the result happened to contain a `/`,
which `docker-compose.yml`'s `postgresql://umami:${POSTGRES_PASSWORD}@umami-db:5432/umami`
passes straight into a `new URL()` call in Umami's `check-db.js` — a `/` there is parsed as a
path separator, not part of the password, so the URL was malformed and Umami crash-looped on
every start (`TypeError: Invalid URL`). Fixed by regenerating both `POSTGRES_PASSWORD` and
`APP_SECRET` with `openssl rand -hex 24` instead — hex output can't contain URL-structural
characters, so the connection string is safe by construction rather than by luck. Required
tearing down the stack and deleting the `umami_db_data` volume, since Postgres had already
initialized its superuser role with the broken password on first boot.

**`postgres:18-alpine` rejects the volume layout `deploy/docker-compose.yml` used.** This is a
genuine bug in the repo, not a config mistake made during this deploy: the compose file mounted
`umami_db_data:/var/lib/postgresql/data`, which worked with earlier Postgres images but which
Postgres 18's Docker image now refuses at startup —
[docker-library/postgres#1259](https://github.com/docker-library/postgres/pull/1259) changed
the image to expect a single volume at the *parent* directory, `/var/lib/postgresql`, so it
can lay out data in a major-version-specific subdirectory. The old mount point produced
`Error: in 18+, these Docker images are configured to store database data in a format which is
compatible with "pg_ctlcluster"...` and refused to start, even against a freshly created,
empty volume. Fixed in `deploy/docker-compose.yml` by changing the mount to
`umami_db_data:/var/lib/postgresql`. Anyone running an older copy of this compose file against
`postgres:18-alpine` will hit this.

**Verification performed:** `docker build` completed clean and produced a working image
(`ghcr.io/rashm1n/blog:latest`, tagged locally — not yet pushed to GHCR by CI). After the two
fixes above, `docker compose ps` showed all four containers (`blog`, `caddy`, `umami`,
`umami-db`) in a stable `Up` state with no restart loops. Content was confirmed end-to-end by
running a throwaway `curlimages/curl` container on the `blog_web` network and fetching
`http://blog:80/` directly (bypassing the edge Caddy, which can't yet get a TLS cert without
DNS) — returned the real homepage, `<title>rashmin — software engineer</title>`. Umami's logs
showed migrations applying successfully and the Next.js server starting clean. Edge Caddy was
confirmed to be routing `rashmin.dev` correctly at the HTTP layer (`Host: rashmin.dev` request
to port 80 returned a `308` redirect to HTTPS, matching the Caddyfile's automatic-HTTPS
behavior), but the HTTPS side itself couldn't be verified — see "Still open."

**Still open:**

- ~~DNS was never pointed at the VPS before or during this deploy~~ Resolved in Phase 10 — see
  below. Left here because the sequence (bring the stack up *before* DNS exists) is the mistake
  worth not repeating on the next fresh deploy.
- CI/CD is still unwired — no GitHub remote push has happened, so `VPS_HOST`, `VPS_USER`,
  `SSH_PRIVATE_KEY` secrets and the `GISCUS_*`/`UMAMI_*` repo variables from
  [`next-steps.md`](./next-steps.md#2-github-repo) are all still todo. Until then, the image
  running on the VPS is a one-off local build and won't update on future pushes to `main`.
- Umami's default `admin`/`umami` login hasn't been changed yet (the UI is reachable now, per
  Phase 10, but the login swap itself hasn't happened).
- Host hardening (`deploy` user, `ufw`, `fail2ban`) from `next-steps.md` step 3 is still
  entirely undone.

## Phase 10 — DNS, and switching off Let's Encrypt for Cloudflare Origin CA

DNS for `rashmin.dev`, `www.rashmin.dev`, and `analytics.rashmin.dev` was added in Cloudflare
— proxied (orange-cloud), not DNS-only — pointing at `77.42.80.2` /
`2a01:4f9:c014:6fd5::1`. This is what Phase 9 was blocked on.

**The predicted rate-limit hit actually happened.** Phase 9's repeated failed ACME attempts
(made before DNS existed) had already burned Let's Encrypt's "too many failed authorizations"
limit for `rashmin.dev` and `www.rashmin.dev` within their 1-hour window. The moment DNS went
live, Caddy's automatic HTTPS validated ownership fine but then got `HTTP 429 rateLimited`
trying to finalize a production-CA order. Caddy's own fallback behavior handled this
gracefully — it obtained a **staging** Let's Encrypt cert as an interim (not served to real
traffic, staging certs aren't browser-trusted; this looked like it should work but a direct TLS
handshake to the origin still failed with `tlsv1 alert internal error`, which was the confusing
part) — then automatically retried production once the rate-limit window passed
(`retry after 2026-08-02 02:48:59 UTC`), succeeding without any manual intervention roughly 3
minutes later. Confirmed via polling: real `Let's Encrypt` (`issuer CN=YE2`) certs live on both
hostnames, `curl` through Cloudflare returning `200`/`301` as expected.

**Then deliberately moved off Let's Encrypt entirely**, to eliminate the rate-limit class of
failure going forward rather than just having recovered from it once. Considered Cloudflare
"Flexible" SSL (Cloudflare↔origin over plain HTTP) — rejected because it drops encryption on
that leg and would require disabling Caddy's automatic HTTP→HTTPS redirect to avoid a proxy
redirect loop (Cloudflare fetches over HTTP, origin 308s to HTTPS, Cloudflare re-enters via
HTTPS, converts back to HTTP for the origin request, repeat). Went with a **Cloudflare Origin
CA certificate** instead — 15-year validity, encrypted end-to-end, but no ACME/rate-limit
exposure ever again for this origin.

- Private key generated *on the VPS* and never left it: `openssl ecparam -genkey -name
  prime256v1` → `/srv/blog/certs/origin-key.pem`, plus a CSR (`origin.csr`, SAN
  `rashmin.dev` + `*.rashmin.dev`) submitted through the Cloudflare dashboard
  (SSL/TLS → Origin Server → Create Certificate → "Use my private key and CSR"). Only the
  signed certificate came back over chat, not key material.
- `deploy/Caddyfile` — added `tls /certs/origin.pem /certs/origin-key.pem` to all three site
  blocks (apex, `www`, `analytics`), replacing Caddy's automatic HTTPS/ACME for these hosts.
  Confirmed via log line `skipping automatic certificate management because one or more
  matching certificates are already loaded` for all three domains on restart.
- `deploy/docker-compose.yml` — mounted `./certs:/certs:ro` into the `caddy` service.
- Verified the cert's public key matches the generated private key
  (`openssl x509 -pubkey` / `openssl ec -pubout`, SHA-256 digest compared) before wiring it in.
- Verified against the origin directly (`curl --resolve ... 127.0.0.1`) for all three hostnames
  that Caddy now presents the Cloudflare Origin certificate, not a Let's Encrypt one, before
  asking for the Cloudflare-side change.
- Cloudflare SSL/TLS mode switched from whatever the zone's default was to **Full (strict)**
  only *after* the origin cert was confirmed live — sequenced deliberately to avoid a window
  where Cloudflare is validating against an origin that isn't ready, which would have taken the
  live site down. Confirmed post-switch: all three hostnames still `200`/`301` through
  Cloudflare.
- The `caddy_data`/`caddy_config` volumes from the Let's Encrypt era were left in place rather
  than cleaned up — they hold now-unused ACME account/cert state, harmless but not pruned.

## Verification performed

Phase 8:

- `pnpm exec astro check` — 0 errors, 0 warnings, 0 hints across 38 files.
- `pnpm build` — 18 pages plus the new endpoints, clean.
- Built JSON-LD on a post parsed with `python3 -m json.tool` and read in full: all four node
  types present, `@id` references resolve within the graph, `image` points at the generated OG
  card, `wordCount` and `timeRequired` populated from the real body.
- Schema `url` / `mainEntityOfPage` confirmed byte-identical to the page's
  `<link rel="canonical">`.
- Homepage graph confirmed to carry `Person` + `WebSite` only — no orphaned article node.
- Breadcrumb `item` confirmed as `https://example.com/blog/` after the trailing-slash fix.
- `dist/llms.txt`, `dist/llms-full.txt` and all three `dist/blog/*.md` files read end to end —
  correct headers, canonical URLs, and body text.
- `sitemap-0.xml` confirmed to exclude the `.md`/`.txt` routes.

Phases 1–6:

- `pnpm astro check` and `pnpm build` run after every phase, confirmed clean (0 errors) before
  proceeding.
- Routes spot-checked via `curl` against local dev/preview servers — all 200.
- OG images visually inspected (rendered correctly).
- RSS feed content confirmed well-formed.
- Pagefind confirmed to index exactly the 3 post pages (scoped via `data-pagefind-body`).

Phase 7, against a real `astro preview` build in Windows Chrome:

- Home, writing index, tags, a post, and 404 rendered and inspected at 1280px in **both**
  light and dark.
- Post page at 1700px — confirms the fixed ToC rail engages and clears the content column.
- 375px layout measured via iframe viewport: `scrollWidth === clientWidth` on both the home
  page and a post, i.e. no horizontal overflow.
- Search exercised end-to-end against the built Pagefind index — query returns the right post
  with `<mark>` highlighting and a mono URL line.
- Generated CSS grepped to confirm the custom variants actually compile (`xs:`,
  `data-[scrolled]:`, `dark:`, `animate-ping-slow`, opacity modifiers on custom colours) —
  Tailwind v4 silently emits nothing for a variant it doesn't recognise, and
  `data-[scrolled]:` in particular was worth confirming rather than assuming.
- 404's runtime path substitution confirmed (it prints the served path, not `/404`).

## Verification *not* performed (known gap)

The Windows-Chrome bridge is screenshot-only — CDP is unreachable from WSL, so there's no way
to drive input events, hover states, or focus. Still needs a manual pass:

- 768px / 1440px widths (375px and 1280px+ are covered above).
- Hover and focus states, keyboard-only navigation, visible focus rings.
- Dark-mode toggle *interaction* and hard-reload flash check. The icon crossfade is pure CSS
  driven by `:root.dark`, so it's correct on first paint by construction, but the click path
  and the `localStorage` round-trip haven't been exercised in a browser.
- The code-block copy button's clipboard write (`navigator.clipboard` needs a secure context —
  `localhost` qualifies, plain-HTTP LAN IPs do not, which is why it wasn't exercised here).
- `prefers-reduced-motion`.
- Lighthouse scores.
- Social preview cards (X/LinkedIn debuggers) — needs a public URL anyway.

## Phase 11 — Reading experience, feeds, and a real CSP

A features-and-hardening pass, done against a headless Chromium driven from this environment —
which closes most of the "known gap" above, since input, focus and hover are all reachable now.

### View transitions without a router

Cross-document transitions are declared in CSS (`@view-transition { navigation: auto }`), not
with Astro's `<ClientRouter />`. The router would have meant re-initialising every top-level
script on `astro:page-load` — seven components' worth of listeners — to buy an effect the
browser now does natively for three lines of CSS and zero bytes of JavaScript. Firefox and
anything older simply navigates normally.

Post titles morph from list row to article heading because both carry the same
`view-transition-name`, derived from the entry id by `titleTransitionName()`. Since ids are
unique per document, the pairing needs no runtime bookkeeping.

### Callouts and external links: two small plugins, no dependencies

`remark-callouts.mjs` recognises GitHub's `> [!NOTE]` syntax; `rehype-external-links.mjs` pins
`rel="noopener noreferrer"` on outbound links and marks them for the ↗ affordance. Both walk
the tree with a four-line recursive function rather than pulling in `unist-util-visit`.

Verified against a temporary fixture post covering all five callout types, a custom title, a
multi-paragraph body, a plain blockquote, and an unknown `[!BOGUS]` type (must stay a
blockquote). Fixture deleted afterwards; the syntax is documented in `README.md` instead.

`markdown.remarkPlugins` / `rehypePlugins` are deprecated in Astro 7 — plugins now go through
`unified()` from `@astrojs/markdown-remark`, which had to be added as a direct dependency
because pnpm's strict layout doesn't expose transitive packages to the config file.

### Native `<dialog>` for both overlays

Search was an `aria-modal="true"` div, which is a claim rather than a behaviour: Tab escaped to
the page behind it. It and the new image lightbox are both `<dialog>` + `showModal()` now,
which supplies the focus trap, Esc handling, background inertness and top-layer stacking for
free. Confirmed by pressing Tab twelve times and asserting `document.activeElement` never left
the dialog, and that focus returns to `#search-trigger` on close.

The lightbox zoom reuses `document.startViewTransition()`: the thumbnail and the full-size
image swap a shared `view-transition-name` inside the update callback, so the two never hold it
simultaneously. No animation library involved.

### The CSP, and why it needed a build-time check

`security.csp` in Astro 7 hashes every inline script it emits and writes a per-page
`<meta http-equiv>`. It does **not** hash `is:inline` scripts — those are passed through
untouched by design. That left four unhashed scripts, all silently non-functional under
enforcement.

Three were fixed by removing the reason they were inline:

- Header and ThemeToggle became ordinary bundled scripts (neither needed to run before paint).
- The Pagefind loader moved to `public/pagefind-loader.js`. It was `is:inline` because Vite
  constant-folds dynamic import specifiers (see Phase 7); a file in `public/` isn't seen by
  Vite *and* is covered by `script-src 'self'`, so one move solved both problems.

The fourth — the theme anti-flash script — genuinely must be inline and blocking, so its hash
is pinned by hand. `scripts/check-csp.mjs` runs in `postbuild` and fails if any inline script's
hash is missing from its page's policy. **It immediately caught a fifth script nobody had
thought about: the 404 page's path-substitution script**, which would have shipped broken.
That is the entire argument for the check — a stale hash has no symptom other than a feature
quietly not running, on a site with no `report-uri` to report it.

Two accommodations the policy needs, both deliberate:

- `style-src-attr 'unsafe-inline'` — Shiki writes per-token colours as inline style
  attributes, and so do the view-transition names. Scoped to `-attr` so `<style>` elements
  stay hash-only; a style attribute can't execute anything.
- `'wasm-unsafe-eval'` in `script-src` — Pagefind's index reader is WebAssembly.

`img-src` initially read `https: data:` and blocked the site's own images over plain HTTP,
which is how the local preview serves them. `'self'` has to be listed explicitly.

### Full-content feeds

RSS now carries `<content:encoded>` and there's a JSON Feed 1.1 at `/feed.json`, both built
from one `feedItems()` helper so they can't disagree. The HTML comes from the container API
(`experimental_AstroContainer`), i.e. the same component pipeline the pages use — so callouts
and syntax highlighting reach the feed exactly as they appear on the site. Root-relative URLs
are rewritten to absolute, since a reader resolves them against its own origin otherwise.

### Verified this phase

Headless Chromium, both colour schemes, 1280px and 390px:

- Zero console errors and zero CSP violations across home, post, archive, tags, about, 404.
- Theme toggle click path and the `localStorage` round-trip — previously untested.
- Search: ⌘K, typing, result rendering with `<mark>`, focus trap, focus restoration.
- Lightbox: open, caption from the Markdown image title, Esc close.
- Copy-link button (secure context — `localhost` qualifies).
- Code-block chrome and Shiki token colours under the enforced policy.
- `scrollWidth === clientWidth` at 390px on every page — no horizontal overflow.
- `rss.xml` and `sitemap-index.xml` parse as XML; `feed.json` parses as JSON.
- `deploy/Caddyfile` adapted to JSON by the real `caddy` binary in Docker, and the resulting
  header set asserted — the first time anything in `deploy/` has been machine-checked.

Still not done: Lighthouse, and the social-preview debuggers (both need the public URL).

### What only the deploy could tell us

Three things were invisible until the change was live, which is the argument for
treating "pushed" and "verified" as separate states:

1. **The edge Caddyfile was never deployed.** `deploy/Caddyfile` is bind-mounted from
   `/srv/blog` and had only ever been updated by hand; the deploy job pulls the blog image and
   restarts that one service. So the `frame-ancestors` / `Permissions-Policy` / COOP headers
   went green through CI and then did nothing — `curl -I https://rashmin.dev` still showed the
   old header set. Anything previously committed to that file was decorative too. CI now
   stages the file, validates it in a throwaway `caddy` container against the real certs, and
   only then moves it into place and reloads.

2. **The giscus stylesheet was blocked.** `client.js` injects a `<link rel="stylesheet">` for
   its own `default.css` into the *host* document, not only into its iframe, so the strict
   `style-src` rejected it. This was structurally untestable locally: the `GISCUS_*` build
   variables are unset in dev, so the component renders a placeholder and never loads the
   script. Found by driving the live page in a real browser and reading the console.

   The `giscus.app/api/discussions` 404 seen next to it is *not* a fault — giscus returns 404
   until a post's discussion is created by its first comment.

3. **`/feed.json` was served as `application/json`.** A static build writes only an endpoint's
   response *body* to disk; the `Content-Type` the route sets is discarded, and Caddy then
   types the file by extension. Pinned in `docker/site.Caddyfile`, the same way the Markdown
   twins already were.
