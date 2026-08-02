import { getCollection, type CollectionEntry } from 'astro:content';

type CollectionName = 'posts' | 'travel';

export async function getPublished<C extends CollectionName>(collection: C) {
  const entries = await getCollection(collection, ({ data }: { data: { draft: boolean } }) =>
    import.meta.env.PROD ? data.draft !== true : true
  );
  return entries.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function readingTime(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function allTags(entries: CollectionEntry<CollectionName>[]): string[] {
  const set = new Set<string>();
  for (const entry of entries) {
    for (const tag of entry.data.tags) set.add(tag);
  }
  return [...set].sort();
}
