import type { APIRoute } from 'astro';
import { AUTHOR_NAME, AUTHOR_ROLE, SITE_LEAD } from '../consts';
import { renderOgCard } from '../utils/og';

export const GET: APIRoute = async () =>
  renderOgCard({
    eyebrow: AUTHOR_ROLE,
    title: AUTHOR_NAME,
    description: SITE_LEAD,
    titleSize: 72,
  });
