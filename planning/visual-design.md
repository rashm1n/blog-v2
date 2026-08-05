# Visual design

The design system this blog uses, and the reasoning behind it. Written after the visual
design pass (Phase 7 — see [`implementation-log.md`](./implementation-log.md)) replaced the
functional-but-generic first-pass styling.

The audience is software engineers. That drives essentially every choice below: minimal
chrome, high information density in list views, code treated as a first-class content type,
and a handful of details that reward people who notice detail. It also rules a lot out —
no gradients-as-decoration, no illustration, no marketing-site motion, no card grids.

## The organising idea

**Sans-serif for reading, monospace as the accent voice.** Rather than pick an accent colour
and lean on it, the system leans on a *typeface* switch. Anything the machine knows —
dates, tags, reading time, URLs, nav chrome, section labels, keyboard hints, counts — is set
in JetBrains Mono. Anything a human wrote is set in Geist Sans. This reads as deliberate
rather than decorative, costs nothing (both fonts already ship), and gives the site a
recognisable texture that a colour scheme alone wouldn't.

Colour then gets to stay almost entirely out of the way: one accent, used sparingly.

## Tokens

All tokens live in `@theme` in `src/styles/global.css` as two complete sets rather than a
mathematical inversion, so light and dark can diverge where they need to.

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `--color-bg` | `#fdfdfc` | `#0c0c0e` | Page background (on `<html>`, not `<body>` — see below) |
| `--color-surface` | `#f4f4f2` | `#151518` | Code blocks, hover states, inset panels |
| `--color-fg` | `#16161a` | `#e9e9e7` | Body text |
| `--color-muted` | `#65656d` | `#8f8f96` | Secondary text, metadata |
| `--color-border` | `#e6e6e2` | `#24242a` | Hairlines, outlines |
| `--color-hairline` | `#efefec` | `#1b1b20` | Very low-contrast fills (ToC card) |
| `--color-accent` | `#6d46d9` | `#a78bfa` | Links, active states, the one highlight |
| `--color-accent-soft` | `#f0ebfd` | `#1c1730` | Search-result `<mark>` background |

**Why a `surface` layer was added.** The first pass had only `bg` and `border`, which forced
code blocks and hover states to fake depth with borders alone. A third neutral gives the
system somewhere to put "inset" material without adding more lines to the page.

**Why the accent moved.** The original `#955df5` measured ≈4.0:1 against the light background
— under the 4.5:1 WCAG AA threshold for body text, and prose links are body text. Deepening
it to `#6d46d9` gives ≈5.7:1 while staying the same hue family. The dark-mode `#a78bfa` is
≈7.2:1. `--color-muted` was checked the same way (≈5.7:1 light, ≈6.1:1 dark) since it carries
real content, not just decoration.

**Backgrounds live on `<html>`, never `<body>`.** The decorative grid is drawn by
`body::before` at `z-index: -1`, which paints *above* the root element's background but
*below* `<body>`'s own. Any `bg-*` utility on `<body>` silently hides the grid. This is a
real trap — `BaseLayout.astro` carries a comment saying so.

## Type

Geist Sans and JetBrains Mono, both already loaded via Astro's Fonts API (unchanged from the
original setup). What the design pass added:

- **Prose at `1.0625rem` (17px), line-height 1.75, measure capped at 68ch.** 17px reads
  better than 16px at this measure without tipping into "large print".
- **`text-wrap: balance` on headings, `pretty` on paragraphs** — stops one-word orphan lines
  on headings, which is very visible at large sizes.
- **The `.label` class** — the mono eyebrow used for section headings, post metadata and
  page kickers. Uppercase, `0.6875rem`, `0.1em` tracking. It appears often enough that it
  earns being a component class rather than a utility pile.
- **`tabular-nums` on every date and count**, so numbers line up in columns.

## Recurring patterns

**`~/rashmin` wordmark.** The home link reads as a shell prompt for a home directory, with
the tilde in accent. It says "engineer" instantly, ties to the mono accent voice, and is
literally true of what the link does.

**`.rule-heading`** — a mono uppercase label followed by a hairline that flexes to fill the
row. Used for every section heading outside of prose. Cheaper visually than a large heading
and gives list pages a consistent rhythm.

**ISO dates in lists, long-form dates on articles.** List rows show `2026-07-14`, right-
aligned in tabular mono; the article header shows `July 14, 2026`. The list is a scanning
context where alignment and sortability matter; the article is a reading context. Both come
from `src/utils/posts.ts` (`formatDateISO` / `formatDate`), and the list `<time>` carries the
long form in `title` so it's still available on hover.

**Post rows, not cards.** Each row is a title, a two-line clamped description, and a mono
meta line. Hover fills a `surface` background using negative margins (`-mx-3 px-3`) so
nothing shifts. Dividers were dropped in favour of spacing plus the hover fill — fewer lines
on the page.

**`⌘K` chip in the header.** A hint that the palette exists, swapped to `Ctrl K` off macOS by
a small inline script. Hidden below the `xs` (30rem) breakpoint along with its divider.

**The dot grid.** Two `linear-gradient` hairlines at a 3rem pitch, `position: fixed`, masked
with a radial gradient so it's strongest at the top of the page and gone by mid-scroll. Fixed
means it costs nothing on scroll. It's meant to be almost subliminal — the density was tuned
up once during review because the first value was invisible.

## Reading experience

**Code blocks get real chrome.** `CodeBlocks.astro` wraps every `.prose pre` at runtime in a
`<figure>` with a bar showing the language and a copy button. Done client-side as progressive
enhancement rather than with a rehype plugin, because it needs no new dependency and the
unenhanced state (a plain bordered `<pre>`) is already fine. The copy button sits at 50%
opacity rather than hidden, because blocks with no language label would otherwise show an
empty bar; it goes fully opaque on hover, focus, and after a copy.

Shiki's dual-theme output is followed for token colours only — the block background is forced
to `transparent` so it inherits the site `surface`. Otherwise code sits in a `#fff`/`#24292e`
rectangle that belongs to the GitHub themes rather than to this site.

**Table of contents, one element, two layouts.** `.toc` renders as an inline bordered card by
default and becomes a fixed sidebar rail at `min-width: 82rem` (`left: calc(50% + 22rem)`,
15rem wide — the container is `max-w-2xl`, so this clears it with a 1rem gutter and needs
~78rem of viewport). Both states are defined in CSS rather than utility classes specifically
so the media query can unset them; Tailwind utilities live in a later cascade layer and would
win. Active-section tracking is a scroll handler that picks the last heading above a 96px
line, rAF-throttled, and it scrolls the active entry into view when the rail overflows.

**Reading progress** is a 2px accent rule at the top of the viewport, scaled by progress
through the `<article>` element specifically — the footer and comments shouldn't count as
reading.

**Heading anchors** are injected by a script in `PostLayout.astro` rather than pulling in
`rehype-autolink-headings`, which would be a dependency for one `<a>` per heading.

## Motion

Deliberately small. A `reveal` fade-up on above-the-fold headers, transform/opacity hovers on
links and arrows, a rotate-and-fade crossfade on the theme toggle, and a 3s pulse on the hero
status dot (Tailwind's 1s `animate-ping` read as an alert, so `--animate-ping-slow` was added
to the theme). All of it sits under the existing `prefers-reduced-motion` block.

**The theme toggle's icon state is pure CSS**, driven by `:root.dark` rather than JavaScript.
This matters: it's correct on the very first paint, so there's no flash and no sync call
needed on load. The click handler only flips the class and persists the choice.

## Accessibility

- Contrast checked for `fg`, `muted` and `accent` against both backgrounds (figures above).
- Skip-to-content link, visible only on focus.
- Focus-visible outlines in the accent colour at 2px with a 3px offset, site-wide.
- The reading-progress bar is `aria-hidden` — it's decoration, and a `progressbar` role with
  no meaningful value announcement is noise.
- The copy button is reachable by keyboard and reveals itself on `:focus-visible`.
- `scrollbar-gutter: stable` on `<html>`, so opening the search modal (which locks body
  scroll) doesn't shift the page sideways.

## Implementation map

| File | Role |
| --- | --- |
| `src/styles/global.css` | Tokens, base layer, `.prose`, code-block chrome, ToC, search-result styles |
| `src/components/PageHeader.astro` | Shared eyebrow + title + description for all list pages |
| `src/components/PostListItem.astro` | The list row |
| `src/components/CodeBlocks.astro` | Runtime code-block chrome + copy button |
| `src/components/ReadingProgress.astro` | Top progress rule |
| `src/components/TableOfContents.astro` | ToC markup + scroll-spy |
| `src/components/Header.astro` | Sticky blurred header, `⌘K` chip, scroll-border script |
| `src/components/ThemeToggle.astro` | CSS-driven icon crossfade |
| `src/components/Search.astro` | Command palette, keyboard nav, Pagefind loader |
| `src/utils/og.ts` | Shared OG card renderer (both OG routes call it) |

## Things deliberately not done

- **No hamburger menu.** Four nav items fit at 375px; a menu would be more chrome, not less.
- **No full-bleed code blocks on wide screens.** Tried mentally, dropped — it collides with
  the fixed ToC rail and the gain is small at a 42rem measure.
- **No view transitions.** Astro supports them, but on a text site they mostly add a frame of
  latency to a navigation that was already instant.
- **No accent beyond one hue.** Tag chips, ToC states and links all share it. Adding a second
  colour would need a reason the content doesn't currently supply.

## Additions from Phase 11

**Semantic colours, callouts only.** Four tokens beyond the single accent —
`--color-info`, `--color-success`, `--color-warning`, `--color-danger` — used by nothing except
`.callout`. Each callout type sets `--callout` and the border, tint, title colour and icon all
derive from it, so adding a type is one rule.

| Token | Light | Dark | Contrast (light / dark) |
| --- | --- | --- | --- |
| `--color-info` | `#0b62d6` | `#7ab0f5` | ≈5.6:1 / ≈8.6:1 |
| `--color-success` | `#0f7a4d` | `#57d6a0` | ≈5.3:1 / ≈10.7:1 |
| `--color-warning` | `#a35a00` | `#f0b429` | ≈5.2:1 / ≈10.4:1 |
| `--color-danger` | `#c02626` | `#f47272` | ≈5.9:1 / ≈7.0:1 |

Callout icons are masked SVG data URIs (`-webkit-mask`/`mask` over a `background` of
`--callout`), so one CSS rule recolours the icon with the type. No icon assets, no sprite.

**Figures.** Prose images become `<figure>` at runtime with a mono, centred caption taken from
the Markdown image *title* — `alt` stays alt. Images are click-to-zoom into a full-viewport
`<dialog>` whose backdrop is a fixed dark blur in both themes (the lightbox is the one surface
that ignores the theme, since a light overlay defeats the purpose).

**Motion.** Two additions, both native and both `prefers-reduced-motion`-aware:

- Cross-document view transitions, 220ms on the root cross-fade. `#site-header` carries its own
  `view-transition-name` so the chrome sits still while content changes under it.
- Post titles morph between list row and article heading (320ms) via a shared
  `view-transition-name` derived from the entry id.

The reduced-motion block turns navigation transitions off entirely (`navigation: none`) rather
than shortening them. Note that an explicit `behavior: 'smooth'` in `scrollTo()` overrides the
CSS `scroll-behavior` the same block sets — `BackToTop.astro` checks the media query in JS for
that reason.

**New chrome.** A back-to-top control (bottom-right, fades in past one viewport height, moves
focus to `#content` so keyboard users travel with the viewport) and a post action row
(mono, hairline-topped: copy link, native share where available, then X / Hacker News /
LinkedIn as plain links that work without JavaScript).

**New pages and sections.** `/archive` groups everything by year as a dense two-column
changelog-style list — dates in `MM/DD` mono, reading time right-aligned. A "Read next" section
scored by shared tags sits above the chronological prev/next pair, with prev/next excluded from
it so the two never show the same post. The homepage ends with a "Topics" row of the eight
most-used tags.
