import { getCollection, type CollectionEntry } from 'astro:content';

type CollectionName = 'posts' | 'travel';

export async function getPublished<C extends CollectionName>(collection: C) {
  const entries = await getCollection(collection, ({ data }: { data: { draft: boolean } }) =>
    import.meta.env.PROD ? data.draft !== true : true
  );
  return entries.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function wordCount(body: string): number {
  return body.trim().split(/\s+/).filter(Boolean).length;
}

export function readingTime(body: string): number {
  return Math.max(1, Math.round(wordCount(body) / 200));
}

/** Where a collection lives in the URL space, and what to call it in a breadcrumb. */
export function sectionFor(collection: CollectionName): { label: string; path: string } {
  return collection === 'travel'
    ? { label: 'Travel', path: '/travel' }
    : { label: 'Writing', path: '/blog' };
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** `2026-07-14` — used in monospace columns where alignment matters. */
export function formatDateISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function allTags(entries: CollectionEntry<CollectionName>[]): string[] {
  const set = new Set<string>();
  for (const entry of entries) {
    for (const tag of entry.data.tags) set.add(tag);
  }
  return [...set].sort();
}
