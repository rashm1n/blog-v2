import type { APIRoute } from 'astro';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';

const fontsDir = join(process.cwd(), 'src/assets/fonts');
const fontRegular = readFileSync(join(fontsDir, 'JetBrainsMono-Regular.ttf'));
const fontBold = readFileSync(join(fontsDir, 'JetBrainsMono-Bold.ttf'));

export const GET: APIRoute = async () => {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 24,
          height: '100%',
          width: '100%',
          padding: '80px',
          backgroundColor: '#0b0b0c',
          color: '#e8e8e6',
          fontFamily: 'JetBrains Mono',
        },
        children: [
          {
            type: 'div',
            props: {
              style: { display: 'flex', fontSize: 64, fontWeight: 700, color: '#b892ff' },
              children: SITE_TITLE,
            },
          },
          {
            type: 'div',
            props: {
              style: { display: 'flex', fontSize: 28, color: '#9a9a97' },
              children: SITE_DESCRIPTION,
            },
          },
        ],
      },
    },
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
};
