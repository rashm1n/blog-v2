// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';

import remarkCallouts from './src/plugins/remark-callouts.mjs';
import rehypeExternalLinks from './src/plugins/rehype-external-links.mjs';

import react from '@astrojs/react';

const SITE = 'https://rashmin.dev';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  output: 'static',
  integrations: [
    mdx(),
    sitemap({
      // `/photos` is an unbuilt stub; don't invite crawlers to index a
      // "coming soon" page as if it were content.
      filter: (page) => !page.includes('/photos'),
    }),
    // shadcn/ui components are React. None of them are given a `client:`
    // directive, so this renders them to static HTML at build time and ships
    // no runtime — the site's script budget is unchanged. Adding a directive
    // to any one of them is what would start costing bytes.
    react(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  fonts: [
    {
      name: 'Geist',
      cssVariable: '--font-face-sans',
      provider: fontProviders.fontsource(),
      weights: [400, 500, 600, 700],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-sans-serif', 'system-ui', 'sans-serif'],
    },
    {
      name: 'JetBrains Mono',
      cssVariable: '--font-face-mono',
      provider: fontProviders.fontsource(),
      weights: [400, 500, 600],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'SFMono-Regular', 'monospace'],
    },
  ],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkCallouts],
      rehypePlugins: [[rehypeExternalLinks, { site: SITE }]],
    }),
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: false,
    },
  },
  security: {
    checkOrigin: true,

    // Astro hashes every inline script and <style> it emits and writes the
    // policy into a per-page <meta http-equiv>. That is what makes a strict
    // script-src possible at all here — the theme anti-flash script, the header
    // scroll listener and the Pagefind loader are all inline by necessity.
    //
    // Header-only directives (frame-ancestors, HSTS) can't live in a <meta>, so
    // they stay in deploy/Caddyfile. The two are meant to be read together.
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        // 'self' has to be listed explicitly — a bare `https:` would block the
        // site's own images over plain http, which is how the local preview
        // server serves them. Data URIs cover the masked SVG callout icons, and
        // https: leaves room for a post to embed an image hosted elsewhere.
        "img-src 'self' https: data:",
        "font-src 'self'",
        "connect-src 'self'",
        // giscus renders comments in its own iframe, under its own policy.
        'frame-src https://giscus.app',
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ],
      scriptDirective: {
        // Pagefind's index reader is WebAssembly; without this, search throws
        // on the first query in a browser that enforces the policy.
        resources: ["'self'", "'wasm-unsafe-eval'", 'https://giscus.app'],

        // Astro hashes the scripts it bundles, but not `is:inline` ones — and
        // the theme anti-flash script in BaseHead has to be inline and blocking
        // or the wrong theme paints first. It is the only such script left, so
        // its hash is pinned here by hand.
        //
        // `pnpm check:csp` (run in postbuild) fails if this drifts out of date
        // and prints the replacement value.
        hashes: ['sha256-pSb2dOMqfkOsAbqWOBQneIZo3tjOufz+0VEX00IQkgM='],
      },
      styleDirective: {
        resources: [
          "'self'",
          // giscus's client.js injects <link rel="stylesheet"> pointing at its
          // own default.css into *this* document, not just into its iframe.
          // Caught only in production, since the giscus build vars are unset
          // locally and the component renders a placeholder without them.
          'https://giscus.app',
          // Shiki writes per-token colours as inline style attributes, as do
          // the view-transition names. Those can't be hashed — but scoping the
          // exemption to `style-src-attr` keeps it away from <style> elements,
          // and unlike a script, a style attribute can't execute anything.
          { resource: "'unsafe-inline'", kind: 'attribute' },
        ],
      },
    },
  },
});
