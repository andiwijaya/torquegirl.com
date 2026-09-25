'use client';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
/** The analyzer never initializes analytics or emits log/file events. */
export function SiteAnalytics() {
  const path = usePathname();
  if (path.startsWith('/tools/obd2-log-analyzer')) return null;
  return <><Script src="https://www.googletagmanager.com/gtag/js?id=G-ECESEE43C4" strategy="afterInteractive" /><Script id="ga4" strategy="afterInteractive">{`window.dataLayer = window.dataLayer || []; function gtag(){window.dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'G-ECESEE43C4');`}</Script></>;
}
