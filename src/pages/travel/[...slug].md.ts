import type { APIRoute } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { MARKDOWN_CONTENT_TYPE, renderMarkdown } from '../../utils/markdown';
import { SITE_URL } from '../../consts';

// See the note in blog/[...slug].md.ts — same route, other collection.
export async function getStaticPaths() {
  const posts = await getCollection('travel', ({ data }: { data: { draft: boolean } }) =>
    import.meta.env.PROD ? data.draft !== true : true
  );

  return posts.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}

export const GET: APIRoute = ({ props, site }) => {
  const { entry } = props as { entry: CollectionEntry<'travel'> };

  return new Response(renderMarkdown(entry, site ?? new URL(SITE_URL)), {
    headers: { 'Content-Type': MARKDOWN_CONTENT_TYPE },
  });
};
