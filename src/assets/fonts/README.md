# Vendored fonts

These are **not** the fonts the site serves to browsers. Pages get Newsreader,
Source Serif 4 and JetBrains Mono through the Astro Fonts API (see
`astro.config.mjs`).

These static files exist for one reason: `src/utils/og.ts` renders the social
cards with satori, which reads font files directly and cannot read woff2. Keeping
a static copy here is what lets the cards be set in the same typefaces as the
pages they advertise.

| File | Family | Used for |
| --- | --- | --- |
| `Newsreader-500.woff` | [Newsreader](https://github.com/productiontype/Newsreader) | The card headline. Fontsource's static `latin-500-normal.woff`. |
| `JetBrainsMono-500.woff` | [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono) | Domain, section, date and reading time. Fontsource's static `latin-500-normal.woff`. |

Both are licensed under the SIL Open Font License 1.1.

Only the weights the cards actually use are kept. Adding a weight to a card
means adding its file here as well; satori will otherwise synthesise it from the
nearest one it has, which looks subtly wrong rather than obviously broken.
