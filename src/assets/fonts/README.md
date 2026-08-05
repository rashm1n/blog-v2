# Vendored fonts

These are **not** the fonts the site serves to browsers. Those come from
Fontsource through Astro's Fonts API, configured in `astro.config.mjs`, and are
subset and served as woff2.

These static TTFs exist for one reason: `src/utils/og.ts` renders the social
cards with satori, which reads font files directly and cannot read woff2 —
Fontsource ships nothing else. Keeping a static copy here is what lets the cards
be set in the same two typefaces as the pages they advertise.

| File | Family | Used for |
| --- | --- | --- |
| `Geist-Regular.ttf`, `Geist-SemiBold.ttf` | [Geist](https://github.com/vercel/geist-font) | The card headline and the author name — the site's `--font-face-sans`. |
| `JetBrainsMono-Regular.ttf`, `JetBrainsMono-Bold.ttf` | [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono) | Dates, reading time, tags and the domain — the site's `--font-face-mono`. |

Both families are licensed under the SIL Open Font License 1.1.

- Geist: Copyright 2024 The Geist Project Authors
- JetBrains Mono: Copyright 2020 The JetBrains Mono Project Authors

Only the weights the cards actually use are kept. Adding a weight to a card
means adding its TTF here as well; satori will otherwise synthesise it from the
nearest one it has, which looks subtly wrong rather than obviously broken.
