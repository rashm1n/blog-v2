import type { CollectionEntry } from 'astro:content';
import { AUTHOR_NAME } from '../consts';
import { formatDateISO, sectionFor } from './posts';

export type PostEntry = CollectionEntry<'posts'> | CollectionEntry<'travel'>;

/**
 * Served as plain text rather than `text/markdown` so a browser renders these
 * in-tab instead of prompting a download. Crawlers and agents read either.
 */
export const MARKDOWN_CONTENT_TYPE = 'text/plain; charset=utf-8';

/** Canonical HTML URL of a post. */
export function postUrl(entry: PostEntry, site: URL): URL {
  return new URL(`${sectionFor(entry.collection).path}/${entry.id}/`, site);
}

/** Path of the raw-Markdown twin of a post page: `/blog/some-post.md`. */
export function markdownPath(entry: PostEntry): string {
  return `${sectionFor(entry.collection).path}/${entry.id}.md`;
}

/**
 * The post as a standalone Markdown document — a header an LLM can read without
 * guessing at provenance, then the body exactly as written. Deliberately not
 * YAML frontmatter: a model quoting this should see a title and a canonical URL
 * as prose, not as machine preamble it may skip.
 */
export function renderMarkdown(entry: PostEntry, site: URL): string {
  const { title, description, pubDate, updatedDate, tags } = entry.data;

  const header = [
    `# ${title}`,
    '',
    `> ${description}`,
    '',
    `- Author: ${AUTHOR_NAME}`,
    `- Published: ${formatDateISO(pubDate)}`,
    ...(updatedDate ? [`- Updated: ${formatDateISO(updatedDate)}`] : []),
    ...(tags.length > 0 ? [`- Tags: ${tags.join(', ')}`] : []),
    `- Canonical URL: ${postUrl(entry, site).href}`,
    '',
    '---',
    '',
    '',
  ];

  return `${header.join('\n')}${(entry.body ?? '').trim()}\n`;
}
