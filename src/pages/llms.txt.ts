import type { APIRoute } from 'astro';
import { AUTHOR_NAME, AUTHOR_ROLE, SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from '../consts';
import { formatDateISO, getPublished } from '../utils/posts';
import { markdownPath, type PostEntry } from '../utils/markdown';

/**
 * An llms.txt index (https://llmstxt.org): a curated, link-per-line map of the
 * site pointing at raw Markdown rather than at HTML a model has to strip chrome
 * out of. Distinct from the sitemap, which lists every URL for crawlers.
 */
export const GET: APIRoute = async ({ site }) => {
  const siteURL = site ?? new URL(SITE_URL);
  const [posts, travel] = await Promise.all([getPublished('posts'), getPublished('travel')]);

  const line = (entry: PostEntry) => {
    const meta = [formatDateISO(entry.data.pubDate)];
    if (entry.data.tags.length > 0) meta.push(entry.data.tags.join(', '));
    const href = new URL(markdownPath(entry), siteURL).href;
    return `- [${entry.data.title}](${href}): ${entry.data.description} (${meta.join('; ')})`;
  };

  const section = (heading: string, entries: PostEntry[]) =>
    entries.length > 0 ? [`## ${heading}`, '', ...entries.map(line), ''] : [];

  const body = [
    `# ${SITE_TITLE}`,
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    `Personal site of ${AUTHOR_NAME}, ${AUTHOR_ROLE.toLowerCase()}. Every post below links to`,
    'its raw Markdown source — appending `.md` to any post URL returns the same. The full text',
    `of every post in one file is at ${new URL('/llms-full.txt', siteURL).href}.`,
    '',
    ...section('Writing', posts),
    ...section('Travel', travel),
    '## Optional',
    '',
    `- [About](${new URL('/about', siteURL).href}): who ${AUTHOR_NAME} is and how this site is built.`,
    `- [RSS feed](${new URL('/rss.xml', siteURL).href}): every post, newest first.`,
    '',
  ].join('\n');

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
