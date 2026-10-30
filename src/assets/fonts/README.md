# Vendored fonts

These are **not** the fonts the site serves to browsers. Those come from
Fontsource through Astro's Fonts API, configured in `astro.config.mjs`, and are
subset and served as woff2.

These static files exist for one reason: `src/utils/og.ts` renders the social
cards with satori, which reads font files directly and cannot read woff2. Keeping a static copy here is what lets the cards
be set in the same typefaces as the pages they advertise.

| File | Family | Used for |
| --- | --- | --- |
| `Newsreader-Medium.woff` | [Newsreader](https://github.com/productiontype/Newsreader) | The card headline and the domain — the site's `--font-face-serif`. Fontsource's static `latin-500-normal.woff` (satori reads woff, not woff2). |
| `Geist-Regular.ttf` | [Geist](https://github.com/vercel/geist-font) | Description, date, reading time and tags — the site's `--font-face-sans`. |

Both families are licensed under the SIL Open Font License 1.1.

- Geist: Copyright 2024 The Geist Project Authors
- Newsreader: Copyright 2020 The Newsreader Project Authors

Only the weights the cards actually use are kept. Adding a weight to a card
means adding its file here as well; satori will otherwise synthesise it from the
nearest one it has, which looks subtly wrong rather than obviously broken.
