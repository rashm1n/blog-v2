# Growth & discoverability

Research into what actually drives readership for a personal technical blog in 2026, the
resulting backlog, and why the first two items were picked. This is a *plan*, not a record of
what's built — see [`decisions.md`](./decisions.md) for the choices already made and
[`implementation-log.md`](./implementation-log.md) for what shipped.

## Starting position

The site's craft was already ahead of most personal dev blogs before any of this — generated OG
cards, Pagefind search, reading progress, no-flash dark mode, clean Lighthouse surface. **Design
was not the bottleneck.** Two things were:

1. `SITE_DESCRIPTION` ("Software engineer. Writing about ai, microservices, distributed systems
   and the occasional trip") describes several hundred thousand people. Nothing tells a stranger
   why to spend eight minutes here rather than elsewhere.
2. Three placeholder posts, one of which is "Setting up this blog" — the single most-written
   post on the internet, and a reliable signal of "nothing here yet."

Everything below is downstream of those two.

## What the research says

Sources are listed at the bottom. The signal is consistent and unglamorous.

**Cadence beats craft.** Blogs publishing at least weekly grow their audience roughly 3× faster
than sporadic publishers. The top personal blogs on Hacker News in 2025 — Simon Willison,
Jeff Geerling, Sean Goedecke, Brian Krebs, Neal Agarwal — all publish weekly or more. Willison
clears 1,000+ posts a year, mostly short link-commentary rather than long-form.

**A clear opinion outperforms a comprehensive survey.** Goedecke's stated formula is "a clear
opinion about working in tech that many people disagree with." On HN specifically: technical
essays, firsthand retrospectives, deep writeups, and real numbers do well; listicles, launch
copy, generic advice, and anything that reads as a traffic grab do not.

**SEO as a growth strategy is largely over for personal blogs.** AI Overviews are attributed
with killing ~38% of organic search traffic. Traffic now comes from HN, Lobsters, newsletters,
and — increasingly — from being cited by an LLM. That last channel is the one almost nobody has
adapted to, which is why it's cheap to win right now.

**Learning is the motive.** 62.2% of blog readers say they read to learn something new. Roughly
80% of bloggers now use AI tooling somewhere in their pipeline, which makes an unvarnished
first-person voice the differentiator rather than volume or polish.

### Bay Area context (audience)

Relevant because it's where the readership and the career leverage are:

- AI/ML engineering postings up 163% YoY; ~63% talent shortage; 500,000+ open roles globally.
- Median time-to-hire stretched to 67 days in Q1 2026, up from 38 days in Q3 2025.
- Entry-level generalist SWE roles down ~25% from their 2023 peak.
- Big tech posting 50–100% more AI engineering roles than a year prior; strong growth in
  fintech, security and observability (Ramp +94%, Wiz +84%, Datadog +68%).

The opening this creates: **the unglamorous infrastructure underneath the AI hype.** The AI
writers aren't infra people, and the infra people are still writing about Kubernetes. That gap
is the one this blog is positioned to fill.

## Content direction

Post ideas at the intersection of existing expertise and current attention:

- **"Agent workflows are just distributed systems with worse failure modes."** Retries,
  idempotency, durable execution, partial failure — material already known here, being
  rediscovered badly elsewhere. High HN ceiling.
- **Postgres as everything.** The deadlock post is the seed. Extend into a series: Postgres as a
  queue, pgvector in production and where it breaks, when a separate vector DB is actually
  warranted.
- **Follow up the Kubernetes post.** Three years of real numbers is the best asset on the site.
  What broke after the migration, the cost table, what would be done differently.
- **A cost post with actual dollar figures.** Real numbers in a table is the most-shared genre
  there is.
- **How an infra engineer actually uses coding agents** — the failure modes, not the tips.
- **One deliberately contrarian post per quarter**, on something defensible in a comment thread.

Before any of this: delete or rewrite the placeholder posts. `next-steps.md` §6 tracks this as
optional; it should be treated as blocking.

## Backlog, ranked

| # | Item | Status | Why it ranks here |
|---|------|--------|-------------------|
| 1 | Short-form `notes`/`til` collection | Not started | Makes weekly cadence survivable when long-form takes two weekends. The Willison mechanism. Collection infra already supports it — roughly an hour of work. |
| 2 | Email subscription | Not started | RSS reaches maybe 5% of potential returning readers. Without this, every HN spike evaporates overnight. Self-hosted [Listmonk](https://listmonk.app) fits the existing Hetzner/Docker/Caddy stack; Buttondown if running it isn't wanted. Form at the *end* of posts — the About page promises no newsletter popup and that promise is worth keeping. |
| 3 | JSON-LD structured data | **Done** (Phase 8) | Cheap, and it's how machines learn this is an entity with a topic rather than a random URL. |
| 4 | llms.txt + Markdown twins | **Done** (Phase 8) | The sleeper bet: small effort, positions the site for how discovery actually works now. |
| 5 | Homepage "Start here" | Not started | A first-time visitor from HN currently has no path to a second page. Three hand-picked posts with one line each on why. |
| 6 | Related posts + series support | Not started | `PostListItem` already carries tags; a "more on #postgres" block is the cheapest session-depth win available. Add an optional `series` field to the schema if the Postgres series happens. |
| 7 | `/now` and `/uses` pages | Not started | Cheap, well-liked in dev-blog culture, more surface area for the name. Fits the existing tone. |
| 8 | One interactive flagship post | Not started | Neal Agarwal is a top-5 HN blog purely on interactive visual essays. A steppable two-transaction lock diagram in the deadlock post would make it far more shareable. Expensive — reserve for one post, not a house style. |

Items 3 and 4 were built first because they're the only two that are pure code with no ongoing
content commitment attached — they compound quietly while the writing cadence is still being
established. Items 1 and 2 are higher-value but require a habit, not a commit.

## Distribution

- Self-submit to HN, Tuesday–Thursday mornings PT. Timing is luck-heavy; resubmitting after a
  failed launch is normal and permitted. Also Lobsters, r/programming, r/devops.
- Be in the comments when posting. HN rewards authors who engage.
- Cross-post excerpts to LinkedIn — genuinely effective for a Bay Area engineering audience —
  but always link back to the domain. Never the full text.
- Comment substantively on other people's posts. Willison's growth is inseparable from being a
  good citizen in other people's threads.

## Explicit non-goals

- AI-generated posts. The voice is the differentiator.
- Listicles and "10 X tips" content.
- Keyword-chasing SEO. That game is over for personal blogs.
- A redesign. The design is fine.

## Sources

- [The Most Popular Blogs of Hacker News in 2025 — Refactoring English](https://refactoringenglish.com/blog/2025-hn-top-5/)
- [State of the software engineering job market in 2026 — Pragmatic Engineer](https://newsletter.pragmaticengineer.com/p/state-of-the-job-market-2026)
- [Software Engineering Job Market 2026: Data, Trends and Outlook](https://www.finalroundai.com/blog/software-engineering-job-market-2026)
- [Should You Write Your Own Blog in 2026? After AI Overviews Killed 38% of Organic Traffic](https://www.birjob.com/blog/should-you-write-blog-2026)
- [How I use LLMs as a staff engineer in 2026 — Sean Goedecke](https://www.seangoedecke.com/how-i-use-llms-in-2026/)
- [Blogging Statistics 2026 — Bloggers Passion](https://bloggerspassion.com/blogging-statistics/)
- [How to write stuff that gets on the front page of Hacker News — Aline Lerner](https://blog.alinelerner.com/how-to-write-stuff-that-gets-on-the-front-page-of-hacker-news/)
- [The AI Talent Market: Skills in Demand & Salary Trends 2026](https://hakia.com/tech-insights/ai-talent-market/)

Research conducted 2026-08-02. Statistics cited are as reported by those sources at that date.
