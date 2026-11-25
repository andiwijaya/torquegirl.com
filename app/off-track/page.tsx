import { articleImage, pageMetadata } from '../../lib/site-seo';
import SiteHeader from '../../components/site-header';
import SiteFooter from '../../components/site-footer';
import { ArrowUpRight } from "lucide-react";
import { offTrackStories, getLatestArticles } from "../../lib/torquegirl-content";

export const metadata = pageMetadata({
  path: "/off-track", title: "Off Track Stories",
  description: "Read TorqueGirl’s stories beyond the garage, starting with a photo essay about playing golf, finding focus and learning a new skill.",
  image: articleImage(offTrackStories[0]),
});

export default function OffTrackPage() {
  return <main className="site-shell article-shell offtrack-archive">
    <SiteHeader active="Off Track" />
    <section className="category-hero offtrack-hero"><p className="eyebrow"><span className="eyebrow-line" />TorqueGirl / beyond the garage</p><h1>Off Track</h1><p>Curiosity takes the long way round. Short stories about trying something new, finding focus, and enjoying the ride.</p></section>
    <section className="article-index offtrack-index" aria-labelledby="offtrack-latest"><div className="article-index-heading"><p className="eyebrow"><span className="eyebrow-line" />A different kind of drive</p><h2 id="offtrack-latest">Out of the garage.</h2></div><div className="article-card-grid">{getLatestArticles(offTrackStories, offTrackStories.length).map((story) => <a className="article-card" href={story.path} key={story.slug}><div className="article-card-image"><img src={story.heroImage} alt={story.heroAlt} width={story.heroWidth} height={story.heroHeight} loading="lazy" /></div><div className="article-card-copy"><div className="article-card-meta"><span>{story.category}</span><span>{story.readingTime}</span></div><h3>{story.title}</h3><p>{story.description}</p><span className="text-link">Read the story <ArrowUpRight size={16} /></span></div></a>)}</div></section>
    <SiteFooter />
  </main>;
}
