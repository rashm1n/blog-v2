import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AUTHOR_NAME, SITE_URL } from '../consts';

/**
 * The social card, rendered at build time into /og/<slug>.png.
 *
 * It is the only part of the site a reader sees before deciding whether to
 * click, and it is seen almost entirely at thumbnail size, so it is built to
 * survive being shrunk: one large headline, one supporting line, and metadata
 * small enough to read as texture rather than compete. 1200×630 is the size
 * every platform agrees on — Facebook, X, LinkedIn, Slack and Discord all crop
 * from it rather than to it.
 *
 * The design deliberately mirrors the page it links to: same aurora wash, same
 * engineering grid, same gradient headline, same mono metadata. A card that
 * looks like its destination is doing a second job as a promise.
 */

/* ----------------------------------------------------------------- colour */

/* The dark-theme tokens from src/styles/global.css, kept in the oklch they are
 * authored in rather than as pre-converted hex. Satori has no oklch() parser,
 * so they are converted below — but keeping the source values means syncing
 * this file with a palette change is a copy-paste, not a colour-space
 * conversion done by hand. The previous version of this card stored hex, and
 * had silently drifted a whole palette behind the site. */
const TOKEN = {
  background: [0.1499, 0.0031, 285.9],
  foreground: [0.9263, 0.0018, 106.42],
  mutedForeground: [0.6413, 0.0105, 286],
  border: [0.2648, 0.0064, 286],
  secondary: [0.2417, 0.0056, 286],
  primary: [0.7137, 0.1434, 292.5],
} as const;

type Oklch = readonly [number, number, number];
type Oklab = readonly [number, number, number];

/** Polar oklch → rectangular oklab, which is the space both mixing and sRGB want. */
const lab = ([L, C, H]: Oklch): Oklab => [
  L,
  C * Math.cos((H * Math.PI) / 180),
  C * Math.sin((H * Math.PI) / 180),
];

/** oklab → `rgb()`/`rgba()`, which is as much colour as satori understands. */
function rgb([L, a, b]: Oklab, alpha = 1): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const [r, g, bl] = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((channel) => {
    const c = Math.max(channel, 0);
    const encoded = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(encoded * 255)));
  });

  return alpha === 1 ? `rgb(${r}, ${g}, ${bl})` : `rgba(${r}, ${g}, ${bl}, ${alpha})`;
}

const css = (color: Oklch, alpha = 1): string => rgb(lab(color), alpha);

/**
 * `color-mix(in oklab, a, b)` with `weight` as a's share, the function the
 * headline already uses in CSS.
 *
 * In oklab and not oklch, which is not a detail: the site's near-white
 * foreground sits at hue 106° and the violet primary at 292°, so interpolating
 * the *hue* between them sweeps through 209° and lands on cyan. Mixing the
 * rectangular a/b coordinates instead walks straight across the middle, which
 * is what `in oklab` means and what the page actually renders.
 */
function mix(a: Oklch, b: Oklch, weight: number): Oklab {
  const [aL, aA, aB] = lab(a);
  const [bL, bA, bB] = lab(b);
  const blend = (x: number, y: number) => x * weight + y * (1 - weight);
  return [blend(aL, bL), blend(aA, bA), blend(aB, bB)];
}

/**
 * A stable hue for the cooler half of the aurora, derived from the slug.
 *
 * Every card carries the same violet primary, so the brand reads instantly in a
 * feed; only the second, dimmer light source moves. The range is 196°–286°,
 * teal through blue to the edge of the primary's own violet — wide enough that
 * two posts sitting next to each other look different, narrow enough that
 * neither of them stops looking like this site.
 */
function auroraHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return 196 + (Math.abs(hash) % 91);
}

/* ------------------------------------------------------------------ fonts */

/* Static TTFs, not the woff2 the browser gets — satori reads font files itself
 * and cannot decode woff2. See src/assets/fonts/README.md. */
const fontsDir = join(process.cwd(), 'src/assets/fonts');

const face = (name: string, file: string, weight: 400 | 600 | 700) =>
  ({ name, data: readFileSync(join(fontsDir, file)), weight, style: 'normal' }) as const;

const FONTS = [
  face('Geist', 'Geist-Regular.ttf', 400),
  face('Geist', 'Geist-SemiBold.ttf', 600),
  face('JetBrains Mono', 'JetBrainsMono-Regular.ttf', 400),
  face('JetBrains Mono', 'JetBrainsMono-Bold.ttf', 700),
];

/* ----------------------------------------------------------------- layout */

type Style = Record<string, unknown>;
type Node = { type: string; props: Record<string, unknown> };

/**
 * Satori lays out with flexbox and nothing else, and throws on any element with
 * more than one child that hasn't said so. Defaulting `display: flex` here
 * makes that impossible to forget.
 */
const box = (style: Style, children?: Node[] | string): Node => ({
  type: 'div',
  props: { style: { display: 'flex', ...style }, children },
});

/** `--grid-line` from the dark palette, nudged up: the card is looked at small. */
const GRID_LINE = 'rgba(255, 255, 255, 0.055)';

/** The site's `.label`: mono, uppercase, wide-tracked, muted. */
const MONO_LABEL: Style = {
  fontFamily: 'JetBrains Mono',
  fontSize: 15,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: css(TOKEN.mutedForeground),
};

/** The `h-2.5 w-px bg-border` separator PostCard uses between date and length. */
const divider = () => box({ width: 1, height: 14, backgroundColor: css(TOKEN.border) });

export interface OgCardOptions {
  title: string;
  description: string;
  /** Mono pill, top right: the section for a post, the role on the home card. */
  kicker: string;
  /** Mono line above the headline — ISO date, reading time. Joined with rules. */
  meta?: string[];
  tags?: string[];
  /** Varies the second aurora light. Pass the slug; anything stable works. */
  seed?: string;
  /** Overrides the length-derived headline size. */
  titleSize?: number;
}

/**
 * Headlines are set as large as they can be without spilling past three lines.
 * Character counts rather than a measured fit, because Geist at these sizes is
 * near enough to uniform that measuring buys nothing — and 46 is the floor,
 * comfortably above the ~40px that still survives a feed thumbnail.
 */
function headlineSize(title: string): number {
  if (title.length > 76) return 46;
  if (title.length > 44) return 54;
  return 64;
}

/**
 * Whether to let satori even out the line lengths.
 *
 * Only for headlines that will certainly wrap into several short-ish words.
 * `text-wrap: balance` narrows the box to the balanced measure, and because the
 * headline is sized to its content (see below) an unbreakable run wider than
 * that measure overflows and is clipped mid-glyph rather than wrapped —
 * "Rashmin" at 72px renders as "Rash".
 */
function shouldBalance(title: string): boolean {
  return title.length > 44 && title.trim().split(/\s+/).length >= 4;
}

export async function renderOgCard({
  title,
  description,
  kicker,
  meta = [],
  tags = [],
  seed = title,
  titleSize,
}: OgCardOptions): Promise<Response> {
  const cool: Oklch = [0.68, 0.12, auroraHue(seed)];
  const domain = SITE_URL.replace(/^https?:\/\//, '');

  const decoration = [
    /* The aurora, carried on one full-bleed layer with both lights on it —
     * the same two-radial-gradient recipe as the page's `body::before`, at the
     * same positions. It has to cover the whole canvas: a gradient painted into
     * a smaller positioned box gets clipped to that box, and the falloff ends in
     * a hard rectangular edge rather than in the background.
     *
     * A little stronger than the page's 0.22/0.12 because the page also blurs
     * this layer by 28px, and blur is the one part not worth paying resvg for
     * at 1200×630 — the gradients are already smooth. */
    box({
      position: 'absolute',
      top: 0,
      left: 0,
      width: 1200,
      height: 630,
      backgroundImage: [
        `radial-gradient(ellipse 46% 62% at 20% 6%, ${css(TOKEN.primary, 0.3)}, transparent 70%)`,
        `radial-gradient(ellipse 42% 56% at 80% 0%, ${css(cool, 0.2)}, transparent 70%)`,
      ].join(', '),
    }),

    /* The engineering grid at the page's own 48px pitch, masked to fade out
     * before it reaches the headline: felt at full size, gone in a thumbnail. */
    box({
      position: 'absolute',
      top: 0,
      left: 0,
      width: 1200,
      height: 630,
      /* Written with the same two-stop-plus-background-size form as the page,
       * rather than the tidier `repeating-linear-gradient(… 0 1px, … 1px 48px)`:
       * satori's gradient parser silently ignores multi-position stops and
       * fills the element flat, so the shorthand renders as a grey wash with
       * no lines in it at all. */
      backgroundImage: [
        `linear-gradient(to right, ${GRID_LINE} 1px, transparent 1px)`,
        `linear-gradient(to bottom, ${GRID_LINE} 1px, transparent 1px)`,
      ].join(', '),
      backgroundSize: '48px 48px',
      maskImage: 'radial-gradient(ellipse 75% 60% at 50% 0%, #000 0%, transparent 78%)',
    }),

    /* Brand rule along the top edge — the one element still legible at any
     * size, which is why it carries both aurora hues. */
    box({
      position: 'absolute',
      top: 0,
      left: 0,
      width: 1200,
      height: 6,
      backgroundImage: `linear-gradient(90deg, ${css(TOKEN.primary)} 0%, ${css(cool)} 52%, ${css(cool, 0)} 100%)`,
    }),
  ];

  const header = box({ alignItems: 'center', justifyContent: 'space-between', width: '100%' }, [
    box({ alignItems: 'center', gap: 18 }, [
      /* The monogram from AuthorAvatar, in the same 135° violet ramp. */
      box(
        {
          width: 60,
          height: 60,
          borderRadius: 30,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage: `linear-gradient(135deg, ${css(TOKEN.primary)}, ${css(TOKEN.primary, 0.55)})`,
          fontFamily: 'JetBrains Mono',
          fontWeight: 700,
          fontSize: 27,
          color: css(TOKEN.background),
        },
        AUTHOR_NAME.charAt(0)
      ),
      box({ flexDirection: 'column', gap: 5 }, [
        box({ fontSize: 25, fontWeight: 600, letterSpacing: '-0.01em' }, AUTHOR_NAME),
        box({ ...MONO_LABEL, fontSize: 16, letterSpacing: '0.02em', textTransform: 'none' }, domain),
      ]),
    ]),

    box(
      {
        ...MONO_LABEL,
        fontSize: 14,
        letterSpacing: '0.14em',
        color: css(TOKEN.primary),
        padding: '9px 18px',
        borderRadius: 999,
        border: `1px solid ${css(TOKEN.primary, 0.3)}`,
        backgroundColor: css(TOKEN.primary, 0.1),
      },
      kicker
    ),
  ]);

  const metaRow = box(
    { alignItems: 'center', gap: 14 },
    meta.flatMap((part, i) => (i === 0 ? [box(MONO_LABEL, part)] : [divider(), box(MONO_LABEL, part)]))
  );

  const body = box({ flexDirection: 'column', gap: 20, width: '100%' }, [
    /* Dropped rather than rendered empty — satori throws on a style object that
     * carries an explicit `undefined`, so "sometimes present" has to mean
     * absent from the tree, not a nulled-out height. */
    ...(meta.length > 0 ? [metaRow] : []),

    /* The page's `.text-gradient`, stop for stop. `alignSelf: flex-start` is
     * what makes it visible: `background-clip: text` paints across the whole
     * box, so a full-width block would spend its entire ramp on the empty space
     * to the right of a short headline and render flat — the same trap the CSS
     * version documents solving with `width: fit-content`. */
    box(
      {
        alignSelf: 'flex-start',
        maxWidth: 1000,
        fontSize: titleSize ?? headlineSize(title),
        fontWeight: 600,
        lineHeight: 1.12,
        letterSpacing: '-0.03em',
        ...(shouldBalance(title) ? { textWrap: 'balance' } : {}),
        lineClamp: 3,
        backgroundImage: `linear-gradient(110deg, ${css(TOKEN.foreground)} 0%, ${css(TOKEN.foreground)} 25%, ${rgb(mix(TOKEN.foreground, TOKEN.primary, 0.45))} 100%)`,
        backgroundClip: 'text',
        color: 'transparent',
      },
      title
    ),

    box(
      {
        maxWidth: 880,
        fontSize: 23,
        lineHeight: 1.5,
        color: css(TOKEN.mutedForeground),
        lineClamp: 2,
      },
      description
    ),
  ]);

  /* The domain mark sits opposite the tags, and moves to the left rail when
   * there are none — a lone mark pinned to the right of an otherwise empty row
   * reads as a stray element rather than a signature. */
  const domainMark = box({ alignItems: 'center', gap: 12 }, [
    box({ width: 34, height: 1, backgroundColor: css(TOKEN.border) }),
    box({ ...MONO_LABEL, fontSize: 15, letterSpacing: '0.06em', textTransform: 'none' }, domain),
  ]);

  const footer = box(
    {
      alignItems: 'center',
      justifyContent: tags.length > 0 ? 'space-between' : 'flex-start',
      width: '100%',
    },
    tags.length === 0
      ? [domainMark]
      : [
          /* PostCard's `#tag` badges, at the size they need to survive a
           * thumbnail. Three is the cap there too. */
          box(
            { gap: 10 },
            tags.slice(0, 3).map((tag) =>
              box(
                {
                  fontFamily: 'JetBrains Mono',
                  fontSize: 16,
                  color: css(TOKEN.mutedForeground),
                  padding: '8px 16px',
                  borderRadius: 8,
                  backgroundColor: css(TOKEN.secondary),
                  border: `1px solid ${css(TOKEN.border)}`,
                },
                `#${tag}`
              )
            )
          ),
          domainMark,
        ]
  );

  const svg = await satori(
    box(
      {
        position: 'relative',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: 1200,
        height: 630,
        padding: '58px 72px 56px',
        backgroundColor: css(TOKEN.background),
        color: css(TOKEN.foreground),
        fontFamily: 'Geist',
      },
      [...decoration, header, body, footer]
    ) as Parameters<typeof satori>[0],
    { width: 1200, height: 630, fonts: FONTS }
  );

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
