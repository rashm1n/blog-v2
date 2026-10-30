import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SITE_URL } from '../consts';

/**
 * The social card, rendered at build time into /og/<slug>.png.
 *
 * It is seen almost entirely at thumbnail size, so it carries one headline and
 * one supporting line, in the site's own palette and typeface.
 * 1200×630 is the size every platform crops from.
 */

/* The dark tokens from src/styles/global.css. Keep in sync by hand. */
const TOKEN = {
  background: '#0d1520',
  foreground: '#dce5ef',
  mutedForeground: '#8b9bb0',
  primary: '#ffc75a',
} as const;

/* ------------------------------------------------------------------ fonts */

/* Static files, not the woff2 the browser gets — satori reads font files itself
 * and cannot decode woff2. See src/assets/fonts/README.md. */
const fontsDir = join(process.cwd(), 'src/assets/fonts');

const face = (file: string, weight: 400 | 500) =>
  ({
    name: 'Schibsted Grotesk',
    data: readFileSync(join(fontsDir, file)),
    weight,
    style: 'normal',
  }) as const;

const FONTS = [face('SchibstedGrotesk-400.woff', 400), face('SchibstedGrotesk-500.woff', 500)];

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

export interface OgCardOptions {
  title: string;
  description: string;
  /** Next to the domain, top left: the section for a post, the role on the home card. */
  kicker: string;
  /** Bottom line — date, reading time. */
  meta?: string[];
  tags?: string[];
  /** Overrides the length-derived headline size. */
  titleSize?: number;
}

/**
 * Headlines are set as large as they can be without spilling past three lines
 * in the 1000px column. 46 is the floor that still survives a
 * feed thumbnail.
 */
function headlineSize(title: string): number {
  if (title.length > 76) return 46;
  if (title.length > 44) return 54;
  return 64;
}

export async function renderOgCard({
  title,
  description,
  kicker,
  meta = [],
  tags = [],
  titleSize,
}: OgCardOptions): Promise<Response> {
  const domain = SITE_URL.replace(/^https?:\/\//, '');
  const muted: Style = { fontSize: 22, color: TOKEN.mutedForeground };

  const header = box({ alignItems: 'baseline', gap: 20 }, [
    box({ fontSize: 30, fontWeight: 500, color: TOKEN.foreground }, domain),
    box(muted, kicker),
  ]);

  const body = box({ flexDirection: 'column', gap: 22, maxWidth: 1000 }, [
    box(
      {
        fontSize: titleSize ?? headlineSize(title),
        fontWeight: 500,
        lineHeight: 1.08,
        letterSpacing: '-0.03em',
        lineClamp: 3,
      },
      title
    ),
    box({ ...muted, fontSize: 24, lineHeight: 1.45, lineClamp: 2 }, description),
  ]);

  // Satori throws on an explicitly `undefined` child, so an empty footer is
  // left out of the tree rather than rendered blank.
  const footerParts = [...meta, ...tags];
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
        fontFamily: 'Schibsted Grotesk',
        // The accent rule the site's reading-progress bar draws, as the one
        // mark of colour on an otherwise neutral card.
        borderTop: `6px solid ${TOKEN.primary}`,
      },
      [header, body, ...(footerParts.length > 0 ? [footer] : [box({ height: 1 })])]
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
