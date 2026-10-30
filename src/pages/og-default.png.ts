import type { APIRoute } from 'astro';
import { AUTHOR_NAME, AUTHOR_ROLE, SITE_LEAD, SITE_URL } from '../consts';
import { renderOgCard } from '../utils/og';
import { allTags, getPublished } from '../utils/posts';

/**
 * The card behind every page that isn't a post — the homepage, /about, the tag
 * index, the 404. No date, and the ring carries every tag on the site: the
 * whole map rather than one post's place on it.
 */
export const GET: APIRoute = async () => {
  const entries = [...(await getPublished('posts')), ...(await getPublished('travel'))];
  return renderOgCard({
    kicker: AUTHOR_ROLE,
    title: AUTHOR_NAME,
    description: SITE_LEAD,
    titleSize: 72,
    seed: SITE_URL,
    tags: allTags(entries),
    showTags: false,
  });
};
