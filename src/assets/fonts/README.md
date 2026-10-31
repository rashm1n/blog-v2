# Vendored fonts

These are **not** the fonts the site serves to browsers. The site serves no
fonts at all: pages use system font stacks (see `src/styles/global.css`).

These static files exist for one reason: `src/utils/og.ts` renders the social
cards with satori, which reads font files directly and cannot read woff2. Keeping a static copy here is what lets the cards
be set in the same typeface as the pages they advertise.

| File | Family | Used for |
| --- | --- | --- |
| `SchibstedGrotesk-500.woff` | [Schibsted Grotesk](https://github.com/schibsted/schibsted-grotesk) | The card headline and the domain. Fontsource's static `latin-500-normal.woff`. |
| `SchibstedGrotesk-400.woff` | Schibsted Grotesk | Description, date, reading time and tags. Fontsource's static `latin-400-normal.woff`. |

Licensed under the SIL Open Font License 1.1 — Copyright 2023 The Schibsted
Grotesk Project Authors.

Only the weights the cards actually use are kept. Adding a weight to a card
means adding its file here as well; satori will otherwise synthesise it from the
nearest one it has, which looks subtly wrong rather than obviously broken.
