import type { APIRoute } from 'astro';
import { AUTHOR_NAME, AUTHOR_ROLE, SITE_LEAD, SITE_URL } from '../consts';
import { renderOgCard } from '../utils/og';

/**
 * The card behind every page that isn't a post — the homepage, /about, the tag
 * index, the 404. No date or tags, because none of those pages have one; the
 * headline is set larger to fill the room that buys.
 */
export const GET: APIRoute = async () =>
  renderOgCard({
    kicker: AUTHOR_ROLE,
    title: AUTHOR_NAME,
    description: SITE_LEAD,
    titleSize: 72,
    seed: SITE_URL,
  });
