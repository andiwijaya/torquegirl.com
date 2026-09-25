import type { Metadata } from "next";
import Link from "next/link";
/* eslint-disable @next/next/no-html-link-for-pages */
import { ArticleShare } from "../../../components/article-share";
import { offTrackGolfDay } from "../../../lib/torquegirl-content";

const path = "/off-track/golf-day";

export const metadata: Metadata = {
  title: "Off Track: Torque Girl’s Golf Day | TorqueGirl",
  description: offTrackGolfDay.description,
  alternates: { canonical: `https://torquegirl.com${path}` },
  openGraph: {
    type: "article",
    title: "Off Track: Torque Girl’s Golf Day",
    description: "A different kind of drive. A short visual story about trying something new, finding your focus, and enjoying the walk.",
    url: `https://torquegirl.com${path}`,
    images: [{ url: offTrackGolfDay.heroImage, width: 1400, height: 933, alt: offTrackGolfDay.heroAlt }],
  },
  twitter: { card: "summary_large_image", title: "Off Track: Torque Girl’s Golf Day | TorqueGirl", description: offTrackGolfDay.description, images: [offTrackGolfDay.heroImage] },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Off Track: Torque Girl’s Golf Day",
  description: offTrackGolfDay.description,
  image: [`https://torquegirl.com${offTrackGolfDay.heroImage}`],
  datePublished: "2026-09-24",
  dateModified: "2026-09-24",
  author: { "@type": "Organization", name: "TorqueGirl" },
  publisher: { "@type": "Organization", name: "TorqueGirl", url: "https://torquegirl.com" },
  mainEntityOfPage: `https://torquegirl.com${path}`,
};

export default function GolfDayPage() {
  return <main className="site-shell article-shell offtrack-story">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
    <header className="site-header article-header"><a className="brand" href="/" aria-label="TorqueGirl home"><span className="brand-mark">T</span><span>Torque<span>Girl</span><b>.com</b></span></a><nav className="nav-links article-nav" aria-label="Main navigation"><a href="/">Home</a><Link href="/engines">Engines</Link><Link href="/#explore">Machines</Link><Link href="/#how-it-works">Learn</Link><Link href="/#about">About</Link><Link className="nav-off-track" href="/off-track" aria-current="page">Off Track</Link></nav></header>
    <article>
      <div className="technical-article offtrack-article">
        <div className="article-intro offtrack-intro">
          <Link className="back-link" href="/off-track">← Off Track stories</Link>
          <div className="article-kicker"><span>Off Track</span><span>24 September 2026</span><span>3 min read</span></div>
          <h1>Off Track: Torque Girl’s Golf Day</h1>
          <p className="article-dek">A different kind of drive.</p>
          <div className="article-byline"><span>By TorqueGirl</span><span>A short visual story</span></div>
          <ArticleShare title={offTrackGolfDay.title} description={offTrackGolfDay.description} path={path} />
        </div>
        <figure className="article-figure offtrack-hero-figure"><img src="/images/articles/golf1.webp" alt="Torque Girl arrives at the course with her golf bag, ready to try a different kind of drive." fetchPriority="high" /><figcaption>A new course, a fresh set of choices, and room to be a beginner.</figcaption></figure>
        <div className="offtrack-chapters">
          <section className="offtrack-opening"><p className="eyebrow"><span className="eyebrow-line" />01 / Step away</p><h2>Try Something Different</h2><p>Today, the tools are lighter and the pace is slower. There’s a new course to read, a club to choose, and no need to know everything before taking the first step.</p><p>Curiosity works anywhere. Sometimes the best way to reset is to trade the workshop for a wide-open fairway.</p></section>
          <section className="offtrack-story-row"><figure className="offtrack-photo"><img src="/images/articles/golf2.webp" alt="Torque Girl focuses on her swing as the ball leaves the tee." loading="lazy" /><figcaption>Find your balance. Pick a line. Commit to the swing.</figcaption></figure><div className="offtrack-story-copy"><p className="eyebrow"><span className="eyebrow-line" />02 / Find the rhythm</p><h2>Focus on the Swing</h2><p>A good swing asks for the same things as any new skill: attention, timing, and a willingness to learn from each attempt.</p><p>One small adjustment at a time. Take a breath, trust the motion, and let the next shot be its own fresh start.</p></div></section>
          <section className="offtrack-story-row offtrack-story-row-reverse"><figure className="offtrack-photo"><img src="/images/articles/golf3.webp" alt="Torque Girl studies a club beside her golf bag on the course." loading="lazy" /><figcaption>There’s as much to enjoy between shots as there is at the tee.</figcaption></figure><div className="offtrack-story-copy"><p className="eyebrow"><span className="eyebrow-line" />03 / Take it in</p><h2>Enjoy the Walk</h2><p>The score can wait. There’s sunlight across the fairway, a little more room to think, and a new view at every turn.</p><p>Not every good day has to be measured in speed or numbers. Sometimes it’s enough to show up, keep moving, and enjoy the walk.</p></div></section>
          <blockquote className="offtrack-quote"><p>“Stay curious. Try things you&apos;re not good at yet.”</p><cite>— Torque Girl</cite></blockquote>
          <div className="offtrack-return"><Link className="text-link" href="/off-track">More Off Track stories <span aria-hidden="true">↗</span></Link></div>
        </div>
      </div>
    </article>
    <footer className="site-footer"><div className="footer-top"><Link className="brand brand-footer" href="/"><span className="brand-mark">T</span><span>Torque<span>Girl</span><b>.com</b></span></Link><p>Machines. Performance. Real engineering.</p></div><div className="footer-bottom"><nav aria-label="Footer navigation"><Link href="/engines">Engines</Link><Link href="/technology">Technology</Link><Link href="/off-track">Off Track</Link><Link href="/#about">About</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="mailto:hello@torquegirl.com">Contact</a></nav><div className="footer-meta"><span>© 2026 TorqueGirl</span><span>English only</span></div></div></footer>
  </main>;
}
