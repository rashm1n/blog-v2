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

export type AnyEntry = CollectionEntry<CollectionName>;

/**
 * Posts worth reading next, ranked by shared tags.
 *
 * Ties break toward the same collection and then toward recency, so a post with
 * no tags in common with anything still gets a sensible list instead of an empty
 * section. Deliberately not a similarity model — with a corpus this size, tag
 * overlap is both the honest signal and the one a reader can predict.
 */
export function relatedTo(entry: AnyEntry, pool: AnyEntry[], limit = 3): AnyEntry[] {
  const tags = new Set(entry.data.tags);

  return pool
    .filter((candidate) => candidate.id !== entry.id || candidate.collection !== entry.collection)
    .map((candidate) => ({
      candidate,
      shared: candidate.data.tags.filter((tag: string) => tags.has(tag)).length,
      sameCollection: candidate.collection === entry.collection ? 1 : 0,
    }))
    .sort(
      (a, b) =>
        b.shared - a.shared ||
        b.sameCollection - a.sameCollection ||
        b.candidate.data.pubDate.valueOf() - a.candidate.data.pubDate.valueOf()
    )
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}

/** Entries grouped by publication year, newest year first. */
export function byYear(entries: AnyEntry[]): [number, AnyEntry[]][] {
  const groups = new Map<number, AnyEntry[]>();
  for (const entry of entries) {
    const year = entry.data.pubDate.getUTCFullYear();
    groups.set(year, [...(groups.get(year) ?? []), entry]);
  }
  return [...groups.entries()].sort((a, b) => b[0] - a[0]);
}

/**
 * A CSS custom-ident pairing a post's list row with its article heading, so the
 * title morphs between the two during a cross-document view transition. Entry
 * ids can contain slashes and dots (nested paths), neither of which is legal in
 * an ident, so everything outside `[a-z0-9]` collapses to a hyphen.
 */
export function titleTransitionName(id: string): string {
  return `post-${id.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

export function allTags(entries: CollectionEntry<CollectionName>[]): string[] {
  const set = new Set<string>();
  for (const entry of entries) {
    for (const tag of entry.data.tags) set.add(tag);
  }
  return [...set].sort();
}
