# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, weighted equally (confirmed):

- **Engineers who come to learn.** Software engineers who land on one post from Hacker News, Lobsters, a LinkedIn excerpt, RSS, or an LLM citation. They want one specific thing, read it on a desktop or a phone, and might go on to a second page.
- **People evaluating the author.** Hiring managers, recruiters and peers who read the writing as evidence of how Rashmin thinks and works as an engineer.

## Product Purpose

rashmin.dev is the personal site of Rashmin, a software engineer. It is a technical writing site first, with travel notes and (later) photos as side sections.

Success looks like this: a stranger reads a post to the end, finds a second one, and comes back through a feed. An evaluator leaves with a clear picture of how the author reasons.

## Positioning

The site has no single niche (confirmed). AI and LLMs, Linux, distributed systems, microservices, "whatever I'm debugging that week", and the occasional trip are held together by one honest first-person voice. The voice is the differentiator, and it is the one thing a neighbouring blog cannot copy.

## Operating Context

- Most readers arrive cold on a single post from a link, not on the homepage.
- Posts are long-form prose with code blocks, images, and GitHub-style callouts.
- Readers also get the content outside the page: full-content RSS (`/rss.xml`) and JSON Feed (`/feed.json`), Markdown twins at `/blog/<slug>.md`, `llms.txt` / `llms-full.txt`, and generated OG cards when a post is shared.
- On the page: ⌘K search (Pagefind), light/dark theme, and giscus comments backed by GitHub Discussions.

## Capabilities and Constraints

- **Stack:** Astro 7 with static output, Tailwind v4, and shadcn/ui rendered at build time with no `client:` directives, so no React runtime ships. Adding a `client:` directive spends JS budget and needs a reason.
- **Security:** a strict CSP is split between `astro.config.mjs` and `deploy/Caddyfile`. Exactly one inline script (the theme anti-flash script) has its hash pinned by hand, and `pnpm check:csp` enforces it at build time. Any new third-party resource needs a manual CSP entry.
- **Content collections:** `posts` and `travel`. Fields: `title`, `description`, `pubDate`, `updatedDate?`, `tags`, `draft`, `heroImage?`. Travel also has `location?` and `coords?`.
- **Authoring extras:** `> [!NOTE|TIP|IMPORTANT|WARNING|CAUTION]` callouts, captions taken from the Markdown image title, click-to-zoom lightbox, and an ↗ marker on external links.
- **OG cards:** built at build time with satori (`src/utils/og.ts`), which has the limits listed in the README.
- **Hosting:** self-hosted Docker and Caddy on a Hetzner VPS behind Cloudflare, with self-hosted Umami analytics (no third-party cookies, no consent banner).
- **Terminology:** nav labels are "Writing" (`/blog`), "Travel" and "About". The site title is lowercase "rashmin".
- **Open decisions:**
  - `/photos` is a stub with no image pipeline chosen, and it is excluded from the sitemap.
  - The travel collection is empty.
  - Backlog items from `planning/growth.md`, none started: notes/TIL collection, email subscription, homepage "Start here", related posts/series, `/now` and `/uses`.

## Brand Commitments

- Name "rashmin" / author "Rashmin", domain rashmin.dev, GitHub `rashm1n`.
- Voice: plain, first person, a little informal. Writing is the author's own, never AI-generated (`planning/growth.md` non-goal).
- No listicles or "10 X tips" posts, and no keyword-chasing SEO (`planning/growth.md`).
- If a subscription form is added, it goes at the end of posts, never in a popup (`planning/growth.md`).

## Evidence on Hand

- Published posts:
  - "Beyond LLMs: Meet Jev, the Model Built for Automation" (2026-09-22)
  - "Omarchy! The brand new Arch Linux experience" (2026-08-02)
- Draft: "SDD: Spec Driven Development" (empty body).
- Post images: `src/assets/posts/jev/`, `src/assets/posts/omarchy/`.
- No headshot. The avatar is a text fallback.
- Absent, and not to be fabricated: travel posts, photos, testimonials, readership or subscriber numbers, and employer or client claims. `planning/growth.md` mentions Kubernetes and Postgres-deadlock posts, but they are not in the repo and must not be cited as existing.

## Product Principles

1. **The writing is the product.** Everything serves reading one post to the end and finding the next.
2. **One voice across many topics.** The author's voice holds the breadth together, not a niche or a template.
3. **The work is the credential.** For evaluators, the posts themselves are the proof. No résumé padding and no invented social proof.
4. **Readable by people and machines alike.** Feeds, Markdown twins and structured data are first-class outputs, not extras.
5. **Owned and light.** Self-hosted, no third-party tracking, and zero client JS unless it earns its place. Travel and photos stay secondary and never shape the main experience.

## Accessibility & Inclusion

The floor is WCAG AA contrast for all text, including meta and links. Also required: a skip link, full keyboard operation (native `<dialog>` for search and the lightbox), and respect for `prefers-reduced-motion`. These were established in `planning/visual-design.md`.
