import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { renderOgCard, type OgCardOptions } from '../../utils/og';
import { formatDateISO, readingTime, sectionFor } from '../../utils/posts';

export async function getStaticPaths() {
  const draftFilter = ({ data }: { data: { draft: boolean } }) =>
    import.meta.env.PROD ? data.draft !== true : true;

  const [posts, travel] = await Promise.all([
    getCollection('posts', draftFilter),
    getCollection('travel', draftFilter),
  ]);

  return [...posts, ...travel].map((entry) => ({
    params: { slug: entry.id },
    // Everything the card needs is resolved here, where the entry is in hand.
    // The card mirrors the meta line the post itself carries — same ISO date,
    // same reading time, same tags — so a reader who clicks through lands on
    // something that matches what they were shown.
    props: {
      title: entry.data.title,
      description: entry.data.description,
      kicker: sectionFor(entry.collection).label,
      meta: [formatDateISO(entry.data.pubDate), `${readingTime(entry.body ?? '')} min read`],
      tags: entry.data.tags,
      seed: entry.id,
    } satisfies OgCardOptions,
  }));
}

export const GET: APIRoute = async ({ props }) => renderOgCard(props as OgCardOptions);
