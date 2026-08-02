import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SITE_TITLE, SITE_URL } from '../consts';

/** Mirrors the dark-mode tokens in src/styles/global.css. */
export const OG = {
  bg: '#0c0c0e',
  fg: '#e9e9e7',
  muted: '#8f8f96',
  border: '#24242a',
  accent: '#a78bfa',
} as const;

const fontsDir = join(process.cwd(), 'src/assets/fonts');
const fontRegular = readFileSync(join(fontsDir, 'JetBrainsMono-Regular.ttf'));
const fontBold = readFileSync(join(fontsDir, 'JetBrainsMono-Bold.ttf'));

const row = (children: unknown[], style: Record<string, unknown> = {}) => ({
  type: 'div',
  props: { style: { display: 'flex', ...style }, children },
});

const text = (children: string, style: Record<string, unknown> = {}) => ({
  type: 'div',
  props: { style: { display: 'flex', ...style }, children },
});

interface CardOptions {
  title: string;
  description: string;
  /** Small monospace line above the title. Defaults to the site handle. */
  eyebrow?: string;
  titleSize?: number;
}

/** Renders the shared social card and returns a PNG response. */
export async function renderOgCard({
  title,
  description,
  eyebrow = `~/${SITE_TITLE}`,
  titleSize = 56,
}: CardOptions): Promise<Response> {
  const svg = await satori(
    row(
      [
        // Accent rule pinned to the top edge.
        row([], {
          position: 'absolute',
          top: 0,
          left: 0,
          width: '1200px',
          height: '8px',
          backgroundColor: OG.accent,
        }),

        text(eyebrow, { fontSize: 26, color: OG.accent }),

        row(
          [
            text(title, { fontSize: titleSize, fontWeight: 700, lineHeight: 1.18 }),
            text(description, { fontSize: 24, color: OG.muted, lineHeight: 1.45 }),
          ],
          { flexDirection: 'column', gap: 22 }
        ),

        row(
          [
            row([], { width: '100%', height: '1px', backgroundColor: OG.border }),
            text(SITE_URL.replace(/^https?:\/\//, ''), {
              fontSize: 20,
              color: OG.muted,
              paddingTop: 20,
            }),
          ],
          { flexDirection: 'column' }
        ),
      ],
      {
        position: 'relative',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        width: '100%',
        padding: '76px 80px 60px',
        backgroundColor: OG.bg,
        color: OG.fg,
        fontFamily: 'JetBrains Mono',
      }
    ) as Parameters<typeof satori>[0],
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'JetBrains Mono', data: fontRegular, weight: 400, style: 'normal' },
        { name: 'JetBrains Mono', data: fontBold, weight: 700, style: 'normal' },
      ],
    }
  );

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
