import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { SITE_TITLE, SITE_DESCRIPTION, SITE_URL } from '../consts';
import { feedItems } from '../utils/feed';

export const GET: APIRoute = async (context) => {
  const site = context.site ?? new URL(SITE_URL);
  const items = await feedItems(site);

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site,
    // Full text, not a teaser: the point of subscribing in a reader is to read
    // there. `content` becomes <content:encoded>, which readers prefer over
    // <description> when both are present.
    items: items.map(({ entry, path, html }) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.pubDate,
      link: path,
      categories: entry.data.tags,
      ...(html ? { content: html } : {}),
    })),
    customData: '<language>en</language>',
  });
};
