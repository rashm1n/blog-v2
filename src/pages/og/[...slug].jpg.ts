import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { renderOgCard, type OgCardOptions } from '../../utils/og';
import { formatDate, readingTime, sectionFor } from '../../utils/posts';

export async function getStaticPaths() {
  const draftFilter = ({ data }: { data: { draft: boolean } }) =>
    import.meta.env.PROD ? data.draft !== true : true;

  const [posts, travel] = await Promise.all([
    getCollection('posts', draftFilter),
    getCollection('travel', draftFilter),
  ]);

  return [...posts, ...travel].map((entry) => ({
    params: { slug: entry.id },
    // The card mirrors the post's own header (section, date, length), so a
    // reader who clicks through lands on what they were shown.
    props: {
      title: entry.data.title,
      kicker: sectionFor(entry.collection).label,
      meta: [formatDate(entry.data.pubDate), `${readingTime(entry.body ?? '')} min read`],
      // Astro keeps the source file's path on the image import, off the enumerable keys.
      image: (entry.data.heroImage as (ImageMetadata & { fsPath?: string }) | undefined)?.fsPath,
    } satisfies OgCardOptions,
  }));
}

export const GET: APIRoute = async ({ props }) => renderOgCard(props as OgCardOptions);
