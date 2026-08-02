import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { renderOgCard } from '../../utils/og';

export async function getStaticPaths() {
  const draftFilter = ({ data }: { data: { draft: boolean } }) =>
    import.meta.env.PROD ? data.draft !== true : true;

  const [posts, travel] = await Promise.all([
    getCollection('posts', draftFilter),
    getCollection('travel', draftFilter),
  ]);

  return [...posts, ...travel].map((entry) => ({
    params: { slug: entry.id },
    props: { title: entry.data.title, description: entry.data.description },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const { title, description } = props as { title: string; description: string };
  return renderOgCard({ title, description });
};
