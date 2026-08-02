---
title: Setting up this blog
description: Notes on the stack behind this site — Astro, Tailwind, Caddy, and a deploy pipeline that doesn't touch TLS on every push.
pubDate: 2026-08-01
tags: [astro, meta]
heroImage: ../../assets/posts/sample-hero.png
---

This is a short post to sanity-check that hero images render correctly, and to leave a
note on the stack for future me.

## The stack

- **Astro**, static output, content collections for posts and travel writing.
- **Tailwind v4**, wired through the Vite plugin, with light/dark tokens defined once
  in a `@theme` block rather than an inverted color filter.
- **Caddy**, running as a long-lived edge container so TLS certificates survive every
  app deploy.
- **GitHub Actions**, building a container image and SSHing into the VPS to pull and
  restart just the blog service.

## Why a hero image on this one

Mostly to confirm the image pipeline — Astro's `image()` schema helper, responsive
`<Image />` output, and the OG card generation — all work end to end before the first
real post goes out.
