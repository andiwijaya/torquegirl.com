import type { Metadata } from 'next';
import type { ArticleSummary } from './torquegirl-content';

export const siteName = 'TorqueGirl';
export const siteOrigin = 'https://torquegirl.com';
export const homeImage = {
  url: '/torque-girl-hero.webp', width: 1024, height: 1536,
  alt: 'TorqueGirl beside a race car',
};

export function siteUrl(path: string) {
  return `${siteOrigin}${path}`;
}

type SeoImage = typeof homeImage;

export function articleImage(article: ArticleSummary): SeoImage {
  return { url: article.heroImage, width: article.heroWidth, height: article.heroHeight, alt: article.heroAlt };
}

type PageSeo = { path: string; title: string; description: string; image?: SeoImage };

export function pageMetadata(
  { path, title, description, image = homeImage }: PageSeo,
  article?: ArticleSummary,
): Metadata {
  const url = siteUrl(path);
  const socialTitle = `${title} — ${siteName}`;
  const socialImage = { ...image, url: siteUrl(image.url) };
  const social = { title: socialTitle, description, images: [socialImage] };

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { 'max-image-preview': 'large' },
    openGraph: {
      ...social, url, siteName,
      ...(article ? {
        type: 'article', publishedTime: article.date, modifiedTime: article.updatedDate,
        section: article.category,
      } : { type: 'website' }),
    },
    twitter: { ...social, card: 'summary_large_image' },
  };
}

export function articleMetadata(article: ArticleSummary): Metadata {
  return pageMetadata({ ...article, title: article.seoTitle ?? article.title, image: articleImage(article) }, article);
}

export const publisher = {
  '@type': 'Organization', '@id': siteUrl('/#organization'), name: siteName, url: siteUrl('/'),
  logo: siteUrl('/favicon.svg'),
};
