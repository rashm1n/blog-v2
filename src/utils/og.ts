import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SITE_URL } from '../consts';

/**
 * The social card, rendered at build time into /og/<slug>.jpg.
 *
 * It is seen at thumbnail size (300–500px wide in a feed), next to the page's
 * own og:title and og:description, so it carries the headline and a picture and
 * nothing a platform already prints underneath it. The card is set like the top of
 * the post it links to: Newsreader headline and mono labels on paper.
 *
 * 1200×630 is the size every platform crops from. JPEG keeps the photo cards
 * well under WhatsApp's ~300 KB cut-off for the large preview.
 */

/* The light tokens from src/styles/global.css. Keep in sync by hand. */
const TOKEN = {
  background: '#fafafa',
  foreground: '#1d1d1d',
  mutedForeground: '#59606b',
  primary: '#0071b8',
  /* The fixed ink the homepage hero sets on the pale sky. */
  skyInk: '#15171a',
} as const;

const W = 1200;
const H = 630;
const PAD = 64;
/* Width of the photo panel on post cards; the text column gets the rest. */
const PHOTO_W = 520;

/* ------------------------------------------------------------------ fonts */

/* Static woff, not the woff2 the browser gets: satori reads font files itself
 * and cannot decode woff2. See src/assets/fonts/README.md. */
const fontsDir = join(process.cwd(), 'src/assets/fonts');

const font = (name: string, file: string) =>
  ({ name, data: readFileSync(join(fontsDir, file)), weight: 500, style: 'normal' }) as const;

const FONTS = [font('Newsreader', 'Newsreader-500.woff'), font('JetBrains Mono', 'JetBrainsMono-500.woff')];

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

/* The site's `.label`: JetBrains Mono, uppercase, tracked. Scaled up to survive a thumbnail. */
const label = (text: string, color: string = TOKEN.mutedForeground): Node =>
  box(
    {
      fontFamily: 'JetBrains Mono',
      fontSize: 20,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color,
    },
    text
  );

/** Crops a photo to cover exactly width×height. `focusY` picks the band of a too-tall photo: 0 top, 1 bottom. */
async function cover(path: string, width: number, height: number, focusY = 0.5): Promise<Buffer> {
  const { width: w = width, height: h = height } = await sharp(path).metadata();
  const scale = Math.max(width / w, height / h);
  const [sw, sh] = [Math.ceil(w * scale), Math.ceil(h * scale)];
  return sharp(path)
    .resize(sw, sh)
    .extract({ left: Math.round((sw - width) / 2), top: Math.round((sh - height) * focusY), width, height })
    .jpeg({ quality: 88 })
    .toBuffer();
}

const img = (jpeg: Buffer, width: number, height: number): Node => ({
  type: 'img',
  props: { src: `data:image/jpeg;base64,${jpeg.toString('base64')}`, width, height },
});

/**
 * The post's hero, whole, on a blurred and dimmed copy of itself. Heroes are
 * landscape and often a wordmark or a screenshot, so cropping one into a
 * portrait panel cuts off the part that says what it is.
 */
async function heroPanel(path: string): Promise<Node> {
  const backdrop = await sharp(await cover(path, PHOTO_W, H)).blur(28).modulate({ brightness: 0.5 }).toBuffer();
  const whole = await sharp(path).resize(PHOTO_W, H, { fit: 'inside' }).toBuffer();
  const panel = await sharp(backdrop).composite([{ input: whole, gravity: 'centre' }]).jpeg({ quality: 88 }).toBuffer();
  return img(panel, PHOTO_W, H);
}

async function toJpeg(tree: Node): Promise<Response> {
  const svg = await satori(tree as Parameters<typeof satori>[0], { width: W, height: H, fonts: FONTS });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
  const jpeg = await sharp(png).jpeg({ quality: 85, mozjpeg: true }).toBuffer();

  /* Only the body of this response reaches disk: a static build discards the
   * headers, and Caddy serves the file by extension. Caching belongs to the
   * edge and should stay short: these filenames are not content-hashed, so an
   * `immutable` card would outlive the post title printed on it. */
  return new Response(new Uint8Array(jpeg), { headers: { 'Content-Type': 'image/jpeg' } });
}

const domain = SITE_URL.replace(/^https?:\/\//, '');

/* ------------------------------------------------------------- post card */

export interface OgCardOptions {
  title: string;
  /** The section, shown after the domain: "Writing", "Travel". */
  kicker: string;
  /** Bottom line: date, reading time. */
  meta: string[];
  /** Absolute path to the post's hero image, if it has one. */
  image?: string;
}

/**
 * As large as the headline can be set without passing four lines. The narrower
 * column next to a photo steps down sooner.
 */
function headlineSize(title: string, narrow: boolean): number {
  const n = narrow ? title.length * 1.6 : title.length;
  if (n > 110) return 56;
  if (n > 70) return 66;
  return 76;
}

export async function renderOgCard({ title, kicker, meta, image }: OgCardOptions): Promise<Response> {
  const text = box(
    {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: `${PAD - 8}px ${PAD}px ${PAD}px`,
    },
    [
      box({ gap: 14 }, [label(domain, TOKEN.primary), label('/'), label(kicker)]),
      box(
        {
          fontFamily: 'Newsreader',
          fontSize: headlineSize(title, Boolean(image)),
          lineHeight: 1.08,
          letterSpacing: '-0.015em',
          color: TOKEN.foreground,
          lineClamp: 4,
        },
        title
      ),
      box({ gap: 32 }, meta.map((part) => label(part))),
    ]
  );

  const children = [text];
  if (image) children.push(await heroPanel(image));

  return toJpeg(
    box({ width: W, height: H, backgroundColor: TOKEN.background, color: TOKEN.foreground }, children)
  );
}

/* ---------------------------------------------------------- default card */

/**
 * The card behind every page that isn't a post. It is the homepage hero:
 * the author's photo of Phang Nga Bay, with the opening sentence in the sky.
 */
export async function renderSiteCard({ lead, photoPath }: { lead: string; photoPath: string }) {
  return toJpeg(
    box({ position: 'relative', width: W, height: H }, [
      // The band with the islands along the bottom edge and open sky above them for the words.
      img(await cover(photoPath, W, H, 0.6), W, H),
      box(
        {
          position: 'absolute',
          top: 0,
          left: 0,
          width: W,
          flexDirection: 'column',
          gap: 22,
          padding: `${PAD - 8}px ${PAD}px`,
        },
        [
          label(domain, TOKEN.skyInk),
          box(
            {
              maxWidth: 900,
              fontFamily: 'Newsreader',
              fontSize: 62,
              lineHeight: 1.1,
              letterSpacing: '-0.015em',
              color: TOKEN.skyInk,
            },
            lead
          ),
        ]
      ),
    ])
  );
}
