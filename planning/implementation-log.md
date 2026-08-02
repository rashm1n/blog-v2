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
