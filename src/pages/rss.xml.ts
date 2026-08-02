import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';

export const GET: APIRoute = async (context) => {
  const draftFilter = ({ data }: { data: { draft: boolean } }) =>
    import.meta.env.PROD ? data.draft !== true : true;

  const [posts, travel] = await Promise.all([
    getCollection('posts', draftFilter),
    getCollection('travel', draftFilter),
  ]);

  const items = [
    ...posts.map((entry) => ({ entry, basePath: '/blog' })),
    ...travel.map((entry) => ({ entry, basePath: '/travel' })),
  ].sort((a, b) => b.entry.data.pubDate.valueOf() - a.entry.data.pubDate.valueOf());

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site!,
    items: items.map(({ entry, basePath }) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.pubDate,
      link: `${basePath}/${entry.id}/`,
      categories: entry.data.tags,
    })),
  });
};
