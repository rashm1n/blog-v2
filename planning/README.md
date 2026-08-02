# Planning & decision log

This folder documents how this blog was designed and built, and why — separate from
`README.md` (which is user/operator-facing setup docs). It exists so the reasoning behind
non-obvious choices survives past the conversation that produced them.

- [`decisions.md`](./decisions.md) — the architectural and design decisions, with rationale.
- [`visual-design.md`](./visual-design.md) — the design system: tokens, type, component
  patterns, motion, accessibility, and which file implements what. Start here before changing
  anything visual.
- [`implementation-log.md`](./implementation-log.md) — phase-by-phase build history, including
  bugs hit and how they were fixed.
- [`next-steps.md`](./next-steps.md) — what's left before this goes live, and what's
  deliberately deferred.
- [`growth.md`](./growth.md) — research into what actually drives readership for a personal
  technical blog, the resulting backlog, and the content direction that falls out of it. The
  only forward-looking doc here that isn't about shipping the site.

## At a glance

Personal blog for a software engineer — technical writing first, travel posts and a photo
gallery later. Built with Astro 7 + Tailwind v4, deployed as a Docker container behind Caddy
on a Hetzner VPS, via GitHub Actions. Custom-built design (no theme fork), so the future photo
gallery isn't fighting someone else's layout opinions. The visual language is "engineered
minimalism": sans-serif for prose, monospace as the accent voice for anything machine-generated,
one accent colour, and code treated as a first-class content type.
