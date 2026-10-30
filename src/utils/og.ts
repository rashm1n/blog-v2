import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SITE_URL } from '../consts';
import { ringMarkup } from './ring';

/**
 * The social card, rendered at build time into /og/<slug>.png.
 *
 * It is seen almost entirely at thumbnail size, so it carries one serif
 * headline, one supporting line, and the post's hash ring on the right —
 * the same mark the post wears on the site, so the card and its
 * destination are recognisably the same thing. 1200×630 is the size every
 * platform crops from.
 */

/* The dark tokens from src/styles/global.css. Keep in sync by hand. */
const TOKEN = {
  background: '#14161a',
  foreground: '#e3e5ea',
  mutedForeground: '#9aa0ab',
  primary: '#93a5ff',
} as const;

/* ------------------------------------------------------------------ fonts */

/* Static files, not the woff2 the browser gets — satori reads font files itself
 * and cannot decode woff2. See src/assets/fonts/README.md. */
const fontsDir = join(process.cwd(), 'src/assets/fonts');

const face = (name: string, file: string, weight: 400 | 500) =>
  ({ name, data: readFileSync(join(fontsDir, file)), weight, style: 'normal' }) as const;

const FONTS = [
  face('Newsreader', 'Newsreader-Medium.woff', 500),
  face('Geist', 'Geist-Regular.ttf', 400),
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

const RING_SIZE = 500;

function ring(seed: string, tags: string[]): Node {
  // scale = px per unit / 2, so the ring's hairlines land at 2px on the card.
  const inner = ringMarkup(
    seed,
    tags,
    { ring: 'rgba(154,160,171,0.45)', chord: TOKEN.mutedForeground, node: TOKEN.foreground, post: TOKEN.primary },
    RING_SIZE / 200,
    0.4
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${RING_SIZE}" height="${RING_SIZE}">${inner}</svg>`;
  return {
    type: 'img',
    props: {
      src: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
      width: RING_SIZE,
      height: RING_SIZE,
      style: { position: 'absolute', right: 20, top: (630 - RING_SIZE) / 2 },
    },
  };
}

export interface OgCardOptions {
  title: string;
  description: string;
  /** Next to the domain, top left: the section for a post, the role on the home card. */
  kicker: string;
  /** Bottom line — date, reading time. */
  meta?: string[];
  tags?: string[];
  /** Print the tags in the footer as well as on the ring. */
  showTags?: boolean;
  /** Places the post on its ring. Pass the slug, the same id PostRing gets. */
  seed?: string;
  /** Overrides the length-derived headline size. */
  titleSize?: number;
}

/**
 * Headlines are set as large as they can be without spilling past three lines
 * in the 640px column left of the ring. 46 is the floor that still survives a
 * feed thumbnail.
 */
function headlineSize(title: string): number {
  if (title.length > 70) return 46;
  if (title.length > 40) return 54;
  return 64;
}

export async function renderOgCard({
  title,
  description,
  kicker,
  meta = [],
  tags = [],
  showTags = true,
  seed = title,
  titleSize,
}: OgCardOptions): Promise<Response> {
  const domain = SITE_URL.replace(/^https?:\/\//, '');
  const muted: Style = { fontSize: 22, color: TOKEN.mutedForeground };

  const header = box({ alignItems: 'baseline', gap: 20 }, [
    box({ fontFamily: 'Newsreader', fontSize: 30, color: TOKEN.foreground }, domain),
    box(muted, kicker),
  ]);

  const body = box({ flexDirection: 'column', gap: 22, maxWidth: 640 }, [
    box(
      {
        fontFamily: 'Newsreader',
        fontSize: titleSize ?? headlineSize(title),
        fontWeight: 500,
        lineHeight: 1.1,
        letterSpacing: '-0.015em',
        lineClamp: 3,
      },
      title
    ),
    box({ ...muted, fontSize: 24, lineHeight: 1.45, lineClamp: 2 }, description),
  ]);

  // Satori throws on an explicitly `undefined` child, so an empty footer is
  // left out of the tree rather than rendered blank.
  const footerParts = [...meta, ...(showTags ? tags : [])];
  const footer = box({ gap: 28 }, footerParts.map((part) => box(muted, part)));

  const svg = await satori(
    box(
      {
        position: 'relative',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: 1200,
        height: 630,
        padding: '56px 72px',
        backgroundColor: TOKEN.background,
        color: TOKEN.foreground,
        fontFamily: 'Geist',
      },
      [ring(seed, tags), header, body, ...(footerParts.length > 0 ? [footer] : [box({ height: 1 })])]
    ) as Parameters<typeof satori>[0],
    { width: 1200, height: 630, fonts: FONTS }
  );

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();

  /* Only the body of this response reaches disk — a static build discards the
   * headers, and Caddy serves the .png by extension. Caching belongs to the
   * edge and should stay short: these filenames are not content-hashed, so an
   * `immutable` card would outlive the post title printed on it. */
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
}
