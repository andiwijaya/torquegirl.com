import Link from "next/link";
/* eslint-disable @next/next/no-html-link-for-pages */
import { ArrowUpRight } from "lucide-react";
import { offTrackStories } from "../../lib/torquegirl-content";

export const metadata = {
  title: "Off Track | TorqueGirl",
  description: "A different side of TorqueGirl: short stories about curiosity, trying new things, and finding a different kind of drive.",
  alternates: { canonical: "https://torquegirl.com/off-track" },
};

export default function OffTrackPage() {
  return <main className="site-shell article-shell offtrack-archive">
    <header className="site-header article-header"><a className="brand" href="/" aria-label="TorqueGirl home"><span className="brand-mark">T</span><span>Torque<span>Girl</span><b>.com</b></span></a><nav className="nav-links article-nav" aria-label="Main navigation"><a href="/">Home</a><Link href="/engines">Engines</Link><Link href="/#explore">Machines</Link><Link href="/#how-it-works">Learn</Link><Link href="/#about">About</Link><Link className="nav-off-track" href="/off-track" aria-current="page">Off Track</Link></nav></header>
    <section className="category-hero offtrack-hero"><p className="eyebrow"><span className="eyebrow-line" />TorqueGirl / beyond the garage</p><h1>Off Track</h1><p>Curiosity takes the long way round. Short stories about trying something new, finding focus, and enjoying the ride.</p></section>
    <section className="article-index offtrack-index" aria-labelledby="offtrack-latest"><div className="article-index-heading"><p className="eyebrow"><span className="eyebrow-line" />A different kind of drive</p><h2 id="offtrack-latest">Out of the garage.</h2></div><div className="article-card-grid">{offTrackStories.map((story) => <a className="article-card" href={`/off-track/${story.slug}`} key={story.slug}><div className="article-card-image"><img src={story.heroImage} alt={story.heroAlt} loading="lazy" /></div><div className="article-card-copy"><div className="article-card-meta"><span>{story.category}</span><span>{story.readingTime}</span></div><h3>{story.title}</h3><p>{story.description}</p><span className="text-link">Read the story <ArrowUpRight size={16} /></span></div></a>)}</div></section>
    <footer className="site-footer"><div className="footer-top"><Link className="brand brand-footer" href="/"><span className="brand-mark">T</span><span>Torque<span>Girl</span><b>.com</b></span></Link><p>Machines. Performance. Real engineering.</p></div><div className="footer-bottom"><nav aria-label="Footer navigation"><Link href="/engines">Engines</Link><Link href="/technology">Technology</Link><Link href="/off-track">Off Track</Link><Link href="/#about">About</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="mailto:hello@torquegirl.com">Contact</a></nav><div className="footer-meta"><span>© 2026 TorqueGirl</span><span>English only</span></div></div></footer>
  </main>;
}
