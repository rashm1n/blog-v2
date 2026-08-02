import type { APIRoute } from 'astro';
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from '../consts';
import { getPublished } from '../utils/posts';
import { renderMarkdown } from '../utils/markdown';

/**
 * The companion to llms.txt: every post's full text in one file, so a model with
 * no fetch tool still gets the whole corpus in a single request.
 */
export const GET: APIRoute = async ({ site }) => {
  const siteURL = site ?? new URL(SITE_URL);
  const [posts, travel] = await Promise.all([getPublished('posts'), getPublished('travel')]);

  const entries = [...posts, ...travel].sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  const body = [
    `# ${SITE_TITLE} — full text`,
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    `Every post, newest first. Index at ${new URL('/llms.txt', siteURL).href}.`,
    '',
    ...entries.map((entry) => renderMarkdown(entry, siteURL)),
  ].join('\n');

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
