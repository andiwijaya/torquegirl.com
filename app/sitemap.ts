import type { MetadataRoute } from 'next';
import { siteDestinations } from '../lib/site-navigation';
import { allArticles, tools } from '../lib/torquegirl-content';
import { homeImage, siteUrl } from '../lib/site-seo';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl('/'), images: [siteUrl(homeImage.url)], lastModified: '2026-11-26' },
    ...siteDestinations.filter(({ href }) => href !== '/' && !href.includes('#')).map(({ href }) => ({ url: siteUrl(href) })),
    ...allArticles.map(article => ({
      url: siteUrl(article.path), lastModified: article.updatedDate ?? article.date, images: [siteUrl(article.heroImage)],
    })),
    ...tools.map(tool => ({ url: siteUrl(tool.path), images: [siteUrl(tool.image)], lastModified: '2026-11-26' })),
    { url: siteUrl('/privacy'), lastModified: '2026-10-03' },
    { url: siteUrl('/terms'), lastModified: '2026-09-22' },
  ];
}
