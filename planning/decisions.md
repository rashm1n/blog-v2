# Decisions

## Design & content

> The visual system was rebuilt in Phase 7. This section records the decisions that have held
> since day one; the design language itself — tokens, type, component patterns, motion —
> is documented in [`visual-design.md`](./visual-design.md).

**Custom-built design, not a theme fork.**
Considered forking an existing Astro blog theme vs. building from scratch. Chose custom because
a photo gallery is planned for later and pre-built themes tend to encode strong layout opinions
that fight a gallery addition. Cost is more upfront work; benefit is no fighting someone else's
CSS later.

**Single column, no sidebar, content-forward.**
Layout is one column, prose measured at ~68ch, generous vertical rhythm, dated post rows
instead of a card grid. Header is text-only (wordmark + nav + search + theme toggle).
Reasoning: this is a technical-writing-first blog for a software-engineer audience — the trend
among that audience is minimal chrome, not marketing-site visual flourishes. Mobile reuses the
same layout at smaller scale rather than a separate mobile design, since there are only ~4 nav
items — a hamburger menu would be over-engineering for that count. (Confirmed at 375px in
Phase 7: everything fits, no overflow.)

The one exception added later: on viewports ≥82rem the table of contents detaches into a fixed
rail beside the article. It's the same element repositioned by a media query, not a second
layout, and below that width it stays an inline card — so the "one column" rule still holds
everywhere a reader is likely to be.

**Two content collections from day one: `posts` and `travel`.**
`travel` is declared and routed even though it launches empty. Cost is one extra schema block;
benefit is that the first travel post needs zero code changes later — no schema migration, no
route restructuring. `/photos` is a stub page only (deferred) since there's no photo pipeline
decision made yet and stubbing costs nothing.

**Type: Geist Sans + JetBrains Mono, via Astro's Fonts API.**
Chose the Fonts API (`fontProviders.fontsource()`) over hand-rolled `@font-face` because it's
stable in Astro 7 and handles self-hosting/preloading without extra config. JetBrains Mono was
picked deliberately for OG-image generation too — see [implementation-log.md](./implementation-log.md)
for why Geist couldn't be reused there. Phase 7 gave the mono a much larger role: it's now the
site's accent voice for all machine-generated text, which is the main thing carrying the visual
identity.

**Color: near-black/near-white, not pure black/white, one restrained accent.**
Pure `#000`/`#fff` reads harsh on OLED and in bright light respectively. All tokens live in
`@theme` in `global.css` as two token sets (not an inversion filter), so light/dark can diverge
arbitrarily instead of being mathematically related. The specific values were revised in
Phase 7 — a `surface` layer added, and the accent deepened because the original failed WCAG AA
against the light background. Current values and contrast figures are tabulated in
[`visual-design.md`](./visual-design.md).

**Dark mode: class-based, `localStorage`-persisted, inline anti-flash script.**
Seeded from `prefers-color-scheme`, then user override persisted. A small inline script runs in
`<head>` before first paint specifically to avoid a flash-of-wrong-theme on load — this only
works if it runs before any rendering, hence inline rather than a bundled script.

## Architecture & infra

**Edge Caddy + app container, not Caddy baked into the app image.**
A long-lived `caddy` service owns TLS certs and reverse-proxies to `blog:80` (internal, no TLS).
Reasoning: redeploying the blog (frequent) never touches TLS termination or the cert volume
(rare to need touching), and the box stays open to adding more services behind the same edge
Caddy later without re-provisioning certs.

**Four-service Compose stack: `caddy`, `blog`, `umami`, `umami-db`.**
Only `caddy` publishes ports. `umami-db` (Postgres) is on a named volume and never
port-published — no reason for the database to be reachable from outside the Docker network.

**Self-hosted Umami over a third-party analytics SaaS.**
Chosen for data ownership and no cookie-consent-banner requirement (no third-party cookies).
Proxied through the blog's own domain (`/stats.js`, `/api/*` on the edge Caddyfile) rather than
served from `analytics.<domain>` directly for the tracking script itself — self-hosted Umami's
default script path is on common ad-blocklists, and first-party-path serving avoids that.

**giscus over a hosted comments SaaS (e.g., Disqus).**
GitHub Discussions-backed, no ads, no tracking, matches the software-engineer audience (most
readers already have GitHub accounts). Trade-off: requires the repo to be public with
Discussions enabled — acceptable since the site's source has no reason to be private.

**Pagefind over an external search service (e.g., Algolia).**
Static, build-time index, zero runtime infra, no API keys or usage limits to manage for a
personal blog's traffic volume. Trade-off: index only exists after a production build, which
required a dev-mode fallback since Pagefind can't run against `astro dev`'s in-memory output.
That trade-off turned out to have teeth — loading a file the bundler can't see fought Vite
hard enough to break search in production for six phases, and the loader now lives in an
`is:inline` script for that reason. Full account in the implementation log.

**Build-time OG images via Satori + resvg, not a runtime image service.**
Static generation means zero runtime cost and the images are cacheable/CDN-friendly forever.
Trade-off: needs real font files at build time (see implementation log).

**GHCR over Docker Hub for the container registry.**
Free, tied to the same GitHub identity already used for Actions auth (`GITHUB_TOKEN`), no
separate account/credentials to manage on the VPS if the package is public.

## Discoverability & machine readability

> Added in Phase 8. The strategic case for prioritising these — and the backlog they were
> pulled from — is in [`growth.md`](./growth.md).

**Structured data as one `@graph`, not per-node script tags.**
Every page emits a single `<script type="application/ld+json">` containing a `@graph` array.
`Person` and `WebSite` carry stable `@id`s (`/#person`, `/#website`) and are emitted site-wide;
post pages append `BlogPosting` and `BreadcrumbList`, which reference the Person by `@id` rather
than repeating it. Reasoning: repeated inline author objects are the most common way personal
blogs end up with three subtly-different versions of the same entity, and the whole point of the
markup is to convince a crawler that one entity wrote all of this. One graph makes that
structurally impossible to get wrong.

**No `potentialAction: SearchAction` on the `WebSite` node.**
The obvious thing to add, and deliberately omitted. Search is client-side Pagefind driven by a
`⌘K` overlay — there is no `?q=` URL to hand a crawler. Advertising a search endpoint that 404s
is worse than advertising none.

**Article nodes are built in `PostLayout`, not `BaseHead`.**
`BaseHead` stays generic — it takes an optional `jsonLd` array so any page can contribute nodes
later. The cost is that the canonical URL expression (`new URL(Astro.url.pathname, siteURL)`) is
written in both files. That duplication is deliberate and load-bearing: if the schema's `url`
and the `<link rel="canonical">` disagree, Google discards the markup entirely, so the two are
kept literally identical rather than derived through an abstraction that could drift.

**Raw-Markdown twins of every post, at `/blog/<slug>.md`.**
Serves the same content without the HTML chrome a model would otherwise have to strip. Routed
via `[...slug].md.ts` alongside the existing `[...slug].astro` — the literal `.md` suffix makes
the route strictly more specific, so they can't collide. Same pattern already proven by
`og/[...slug].png.ts`. Advertised from each post's `<head>` with
`<link rel="alternate" type="text/markdown">`.

**A prose header on the Markdown twins, not YAML frontmatter.**
Each `.md` opens with an H1, a blockquote description, a metadata list and the canonical URL,
then the body verbatim. Frontmatter was the first instinct and was rejected: a model quoting the
document should encounter the title and canonical URL as readable prose it will carry into a
citation, not as machine preamble it may treat as skippable.

**`.md` served as `text/plain`, declared as `text/markdown`.**
The `rel="alternate"` link declares `type="text/markdown"` because that is the format. The
bytes go out as `text/plain; charset=utf-8`, pinned by an explicit rule in
`docker/site.Caddyfile`, because browsers download `text/markdown` and the edge sets `nosniff`
so there is no fallback. The mismatch is intentional: format and transport are different
questions, and a file a human can click and read beats a strictly-correct download prompt.

**Both `llms.txt` and `llms-full.txt`.**
`llms.txt` follows [llmstxt.org](https://llmstxt.org) — a curated, one-link-per-line map
pointing at the Markdown twins. It is not a second sitemap: the sitemap lists every URL for
crawlers, this lists the things worth reading, in sections, with descriptions.
`llms-full.txt` concatenates every post's full text so a model without a fetch tool gets the
whole corpus in one request. It roughly doubles the corpus on disk for a site this size, which
is nothing, and it's part of the same convention — cheap enough that it wasn't worth agonising
over.

## Scope boundaries (deliberate, not oversights)

- **Photos**: route stubbed (`/photos`), no gallery implementation, no image-pipeline decision
  made yet. Additive later — doesn't require touching existing routes.
- **Domain**: not registered at build time. `https://example.com` used as a placeholder
  everywhere a domain is needed, all read from `src/consts.ts` or env vars so the real domain
  is a small, mechanical swap later (see [next-steps.md](./next-steps.md)).
- **Local Docker build/run**: not verified locally — Docker isn't installed in the dev
  environment. The `Dockerfile` and Compose stack were written in full but verification is
  deferred to the VPS, which already has Docker.
- **GitHub remote**: repo is `git init`'d locally only, no remote pushed yet. giscus and the
  GHCR deploy workflow are written but can't be verified end-to-end until a remote exists.

## Reading experience & hardening

> Added in Phase 11. Implementation detail and what was verified is in
> [`implementation-log.md`](./implementation-log.md#phase-11--reading-experience-feeds-and-a-real-csp).

**CSS view transitions, not Astro's `<ClientRouter />`.**
Cross-document transitions are declared with `@view-transition { navigation: auto }` in
`global.css`. The router alternative would have required re-initialising every top-level script
on `astro:page-load` — a large surface area of subtle lifecycle bugs — to buy an effect the
browser now performs natively for three lines of CSS and no JavaScript. Browsers without
support navigate normally, which is the same experience the site had before.

**Two hand-written markdown plugins instead of the usual dependencies.**
Callouts would normally mean `remark-directive` + `unist-util-visit`; external-link handling
would mean `rehype-external-links`. Both are replaced by ~40-line local plugins sharing a
four-line tree walker. For a tree this small the dependency is the more expensive option, and
GitHub's `> [!NOTE]` syntax was chosen specifically so posts still read correctly as plain
Markdown on GitHub and in the `/blog/<slug>.md` twins.

**Callouts are the one place the single-accent rule bends.**
Four semantic colours (`info`, `success`, `warning`, `danger`) were added as tokens. A warning
that isn't amber and a caution that isn't red communicate worse than a wider palette does, and
these are the only components allowed to use them. Each is ≥5:1 on its background, checked the
same way the accent was — callout titles are text, not decoration.

**Native `<dialog>` for search and the lightbox.**
The search overlay previously declared `role="dialog" aria-modal="true"` on a div, which is a
claim about behaviour rather than the behaviour itself — Tab escaped to the page behind it.
`showModal()` supplies the focus trap, Esc handling, background inertness and top-layer
stacking natively. Less code than the version that didn't work.

**Image and figure enhancement client-side, not via rehype.**
`PostImages.astro` wraps prose images at runtime, following the pattern `CodeBlocks.astro`
already established. A rehype plugin would have to run in a defined order relative to Astro's
own image handling, which is a fight with no upside here; the unenhanced state (a plain
bordered image) is already fine.

**A build-time CSP check, because a stale hash has no symptom.**
Astro's `security.csp` hashes the scripts it bundles but not `is:inline` ones. The site was
reduced to a single inline script (the theme anti-flash script, which must run before paint)
with its hash pinned by hand; everything else was either bundled or moved to `public/`.
`scripts/check-csp.mjs` fails the build if any inline script isn't covered. This is not
belt-and-braces: an invalidated hash produces no error, no console message and no report —
just a feature that silently stops running for every visitor. It caught the 404 page's script
on its first run.

**`style-src-attr 'unsafe-inline'`, scoped deliberately.**
Shiki emits per-token colours as inline style attributes and cannot be made to stop. The
exemption is confined to the `-attr` variant so `<style>` elements remain hash-only, and unlike
a script, a style attribute has no execution capability.

**Full-content feeds, generated from one source.**
RSS gained `<content:encoded>` and a JSON Feed was added at `/feed.json`; both are built from a
single `feedItems()` helper so the two can never disagree. Content is rendered through the
container API rather than a second Markdown renderer, so callouts and syntax highlighting reach
subscribers exactly as they appear on the site. Not re-sanitised: this is first-party content
already served as HTML from this origin, so a sanitiser would add a dependency without removing
a threat.
