import { publisher, siteName, siteUrl } from '../lib/site-seo';
import type { ArticleSummary } from '../lib/torquegirl-content';

export function JsonLd({ id, data }: { id: string; data: Record<string, unknown> }) {
  const json = JSON.stringify({ '@context': 'https://schema.org', ...data }).replace(/</g, '\\u003c');
  return <script id={id} type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

type Breadcrumb = { name: string; path: string };

export function BreadcrumbData({ trail }: { trail: readonly Breadcrumb[] }) {
  return <JsonLd id="breadcrumb-data" data={{
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', path: '/' }, ...trail].map(({ name, path }, index) => ({
      '@type': 'ListItem', name, position: index + 1, item: siteUrl(path),
    })),
  }} />;
}

const articleSections = {
  engines: { name: 'Engines', path: '/engines' },
  technology: { name: 'Technology', path: '/technology' },
  'off-track': { name: 'Off Track', path: '/off-track' },
};

export function ArticleData({ article, section }: { article: ArticleSummary; section: keyof typeof articleSections }) {
  return <>
    <JsonLd id="article-data" data={{
      '@type': 'Article', headline: article.title, description: article.description,
      image: [siteUrl(article.heroImage)], datePublished: article.date,
      dateModified: article.updatedDate ?? article.date, mainEntityOfPage: siteUrl(article.path),
      author: { '@type': publisher['@type'], '@id': publisher['@id'], name: siteName, url: publisher.url },
      publisher, inLanguage: 'en', articleSection: article.category,
    }} />
    <BreadcrumbData trail={[articleSections[section], { name: article.title, path: article.path }]} />
  </>;
}
