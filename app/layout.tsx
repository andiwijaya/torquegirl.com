import type { Metadata } from "next";
import { SiteAnalytics } from "../components/site-analytics";
import { siteName, siteOrigin } from "../lib/site-seo";
import "./globals.css";
import "./hero-responsive.css";
import "./article.css";
import "./featured-article.css";
import "./article-turbo.css";
import "./article-legends.css";
import "./article-technology.css";
import "./legal.css";
import "./site-shell.css";
import "./home-discovery.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: { default: siteName, template: `%s — ${siteName}` },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <SiteAnalytics />
      </body>
    </html>
  );
}
