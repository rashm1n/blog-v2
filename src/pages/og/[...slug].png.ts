import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SITE_TITLE } from '../../consts';

const fontsDir = join(process.cwd(), 'src/assets/fonts');
const fontRegular = readFileSync(join(fontsDir, 'JetBrainsMono-Regular.ttf'));
const fontBold = readFileSync(join(fontsDir, 'JetBrainsMono-Bold.ttf'));

export async function getStaticPaths() {
  const draftFilter = ({ data }: { data: { draft: boolean } }) =>
    import.meta.env.PROD ? data.draft !== true : true;

  const [posts, travel] = await Promise.all([
    getCollection('posts', draftFilter),
    getCollection('travel', draftFilter),
  ]);

  return [...posts, ...travel].map((entry) => ({
    params: { slug: entry.id },
    props: { title: entry.data.title, description: entry.data.description },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { title, description } = props as { title: string; description: string };

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
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
              style: { display: 'flex', fontSize: 28, color: '#b892ff' },
              children: SITE_TITLE,
            },
          },
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column', gap: 24 },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', fontSize: 56, fontWeight: 700, lineHeight: 1.2 },
                    children: title,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', fontSize: 24, color: '#9a9a97' },
                    children: description,
                  },
                },
              ],
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
