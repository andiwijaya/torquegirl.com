import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://torquegirl.com"),
  title: { default: "TorqueGirl — Engineering Behind Powerful Machines", template: "%s — TorqueGirl" },
  description: "Explore the engineering behind racing cars, powerful engines, motorsport technology, and extraordinary machines with TorqueGirl.",
  alternates: { canonical: "https://torquegirl.com" },
  openGraph: { type: "website", url: "https://torquegirl.com", siteName: "TorqueGirl", title: "TorqueGirl — Engineering Behind Powerful Machines", description: "TorqueGirl explains what makes powerful machines work—from racing powertrains to iconic engineering.", images: [{ url: "/torque-girl-hero.png", width: 1024, height: 1536, alt: "TorqueGirl beside a race car" }] },
  twitter: { card: "summary_large_image", title: "TorqueGirl — Engineering Behind Powerful Machines", description: "Explore the engineering behind racing cars, powerful engines, and extraordinary machines.", images: ["/torque-girl-hero.png"] },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
