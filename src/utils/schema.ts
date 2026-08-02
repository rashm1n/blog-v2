import type { CollectionEntry } from 'astro:content';
import { AUTHOR_NAME, AUTHOR_ROLE, SITE_DESCRIPTION, SITE_TITLE, SOCIAL_LINKS } from '../consts';

/** One node in the `@graph`. Values are whatever schema.org calls for. */
export type JsonLdNode = Record<string, unknown>;

/** Google truncates headlines past ~110 characters in rich results. */
const HEADLINE_MAX = 110;

const personId = (site: URL) => new URL('#person', site).href;
const websiteId = (site: URL) => new URL('#website', site).href;

/**
 * The two nodes every page carries: who wrote this site, and what the site is.
 * Article nodes reference them by `@id` rather than repeating them.
 */
export function siteNodes(site: URL): JsonLdNode[] {
  const person: JsonLdNode = {
    '@type': 'Person',
    '@id': personId(site),
    name: AUTHOR_NAME,
    url: site.href,
    jobTitle: AUTHOR_ROLE,
    description: SITE_DESCRIPTION,
    sameAs: SOCIAL_LINKS.filter((link) => link.url.startsWith('http')).map((link) => link.url),
  };

  const website: JsonLdNode = {
    '@type': 'WebSite',
    '@id': websiteId(site),
    url: site.href,
    name: SITE_TITLE,
    description: SITE_DESCRIPTION,
    inLanguage: 'en',
    publisher: { '@id': personId(site) },
    // Deliberately no `potentialAction: SearchAction` — search is client-side
    // Pagefind with no ?q= URL to hand a crawler, and advertising one that
    // 404s is worse than advertising none.
  };

  return [person, website];
}

interface ArticleInput {
  site: URL;
  entry: CollectionEntry<'posts'> | CollectionEntry<'travel'>;
  /** Canonical page URL — must match the `<link rel="canonical">` exactly. */
  canonical: URL;
  /** Absolute URL of the generated social card. */
  image: URL;
  /** Where this post lives in the URL space, for the breadcrumb's middle rung. */
  section: { label: string; path: string };
  wordCount: number;
  minutes: number;
}

/** `BlogPosting` + `BreadcrumbList` for a single post page. */
export function articleNodes({
  site,
  entry,
  canonical,
  image,
  section,
  wordCount,
  minutes,
}: ArticleInput): JsonLdNode[] {
  const { title, description, pubDate, updatedDate, tags } = entry.data;

  const headline =
    title.length > HEADLINE_MAX ? `${title.slice(0, HEADLINE_MAX - 1).trimEnd()}…` : title;

  const article: JsonLdNode = {
    '@type': 'BlogPosting',
    '@id': `${canonical.href}#article`,
    isPartOf: { '@id': websiteId(site) },
    mainEntityOfPage: canonical.href,
    url: canonical.href,
    headline,
    name: title,
    description,
    inLanguage: 'en',
    datePublished: pubDate.toISOString(),
    // Absent an explicit update, the publish date is the last modification.
    dateModified: (updatedDate ?? pubDate).toISOString(),
    author: { '@id': personId(site) },
    publisher: { '@id': personId(site) },
    image: image.href,
    wordCount,
    timeRequired: `PT${minutes}M`,
    ...(tags.length > 0 ? { keywords: tags } : {}),
  };

  const breadcrumb: JsonLdNode = {
    '@type': 'BreadcrumbList',
    '@id': `${canonical.href}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: site.href },
      {
        '@type': 'ListItem',
        position: 2,
        name: section.label,
        // Trailing slash so this matches the index page's own canonical URL.
        item: new URL(`${section.path}/`, site).href,
      },
      // Per Google's guidance the current page is the last crumb and carries no `item`.
      { '@type': 'ListItem', position: 3, name: title },
    ],
  };

  return [article, breadcrumb];
}

/**
 * Serialize a graph for a `<script type="application/ld+json">` body. A literal
 * `</script>` inside any string value would close the tag early, so every `<`
 * is escaped — legal JSON, inert HTML.
 */
export function jsonLdScript(nodes: JsonLdNode[]): string {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes }).replace(
    /</g,
    '\\u003c'
  );
}
