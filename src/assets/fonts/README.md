# Vendored fonts

These are **not** the fonts the site serves to browsers. Those come from
Fontsource through Astro's Fonts API, configured in `astro.config.mjs`, and are
subset and served as woff2.

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

## Served fonts

`MartianMono-latin-standard.woff2` is the exception: it **is** served to
browsers, through the local provider in `astro.config.mjs`. It is Fontsource's
variable "standard" file (weight 100–800 and width 75–112.5), fetched from
`cdn.jsdelivr.net/fontsource/fonts/martian-mono:vf@latest/latin-standard-normal.woff2`.
The npm/Fontsource provider only resolves the weight axis, and the headlines
are set condensed. OFL 1.1, Copyright 2021 The Martian Mono Project Authors.
