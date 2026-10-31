import type { APIRoute } from 'astro';
import { join } from 'node:path';
import { SITE_LEAD } from '../consts';
import { renderSiteCard } from '../utils/og';

/** The card behind every page that isn't a post: the homepage, /about, the tag index, the 404. */
export const GET: APIRoute = async () =>
  renderSiteCard({
    lead: SITE_LEAD,
    photoPath: join(process.cwd(), 'src/assets/photos/samet-nangshe.jpg'),
  });
