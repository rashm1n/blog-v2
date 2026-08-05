import type { APIRoute } from 'astro';
import { AUTHOR_NAME, SITE_TITLE, SITE_DESCRIPTION, SITE_URL, SOCIAL_LINKS } from '../consts';
import { feedItems } from '../utils/feed';

/**
 * JSON Feed 1.1 — https://jsonfeed.org/version/1.1
 *
 * Sits alongside RSS rather than replacing it: RSS is what the long tail of
 * readers speaks, JSON Feed is what anything written this decade would rather
 * parse. Both are generated from the same items, so they can't disagree.
 */
export const GET: APIRoute = async (context) => {
  const site = context.site ?? new URL(SITE_URL);
  const items = await feedItems(site);

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: SITE_TITLE,
    home_page_url: site.href,
    feed_url: new URL('/feed.json', site).href,
    description: SITE_DESCRIPTION,
    language: 'en',
    authors: [
      {
        name: AUTHOR_NAME,
        url: SOCIAL_LINKS.find((link) => link.label === 'GitHub')?.url,
      },
    ],
    items: items.map(({ entry, path, html }) => {
      const url = new URL(path, site).href;
      return {
        id: url,
        url,
        title: entry.data.title,
        summary: entry.data.description,
        ...(html ? { content_html: html } : { content_text: entry.data.description }),
        date_published: entry.data.pubDate.toISOString(),
        ...(entry.data.updatedDate
          ? { date_modified: entry.data.updatedDate.toISOString() }
          : {}),
        ...(entry.data.tags.length > 0 ? { tags: entry.data.tags } : {}),
        image: new URL(`/og/${entry.id}.png`, site).href,
      };
    }),
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: {
      // The registered type for JSON Feed; readers sniff for it.
      'Content-Type': 'application/feed+json; charset=utf-8',
    },
  });
};
