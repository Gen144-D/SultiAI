import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/** Static marketing routes. Anything dynamic (e.g. /download) is added below. */
const ROUTES = [
  { path: '', priority: 1, changeFrequency: 'weekly' as const },
  { path: '/download', priority: 1, changeFrequency: 'daily' as const },
  { path: '/features', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/how-it-works', priority: 0.8, changeFrequency: 'monthly' as const },
  { path: '/api', priority: 0.7, changeFrequency: 'monthly' as const },
  { path: '/culture', priority: 0.6, changeFrequency: 'monthly' as const },
  { path: '/pricing', priority: 0.6, changeFrequency: 'monthly' as const },
  { path: '/faq', priority: 0.5, changeFrequency: 'monthly' as const },
  { path: '/about', priority: 0.5, changeFrequency: 'yearly' as const },
  { path: '/contact', priority: 0.4, changeFrequency: 'yearly' as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
