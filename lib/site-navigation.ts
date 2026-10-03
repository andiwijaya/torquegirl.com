export const siteDestinations = [
  { label: 'Home', href: '/' },
  { label: 'Engines', href: '/engines' },
  { label: 'Technology', href: '/technology' },
  { label: 'Tools', href: '/tools' },
  { label: 'Off Track', href: '/off-track' },
  { label: 'About', href: '/#about' },
] as const;

export type SiteDestination = (typeof siteDestinations)[number]['label'];
