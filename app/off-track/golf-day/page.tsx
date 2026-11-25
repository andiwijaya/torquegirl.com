import { ArticleData } from '../../../components/seo-structured-data';
import { articleMetadata } from '../../../lib/site-seo';
import SiteHeader from '../../../components/site-header';
import SiteFooter from '../../../components/site-footer';
import Link from '../../../components/document-link';
import { ArticleShare } from "../../../components/article-share";
import { offTrackGolfDay } from "../../../lib/torquegirl-content";

export const metadata = articleMetadata(offTrackGolfDay);

export default function GolfDayPage() {
  return <main className="site-shell article-shell offtrack-story">
    <ArticleData article={offTrackGolfDay} section="off-track" />
    <SiteHeader active="Off Track" />
    <article>
      <div className="technical-article offtrack-article">
        <div className="article-intro offtrack-intro">
          <Link className="back-link" href="/off-track">← Off Track stories</Link>
          <div className="article-kicker"><span>Off Track</span><time dateTime={offTrackGolfDay.date}>24 September 2026</time><span>3 min read</span></div>
          <h1>{offTrackGolfDay.title}</h1>
          <p className="article-dek">A different kind of drive.</p>
          <div className="article-byline"><span>By TorqueGirl</span><span>A short visual story</span></div>
          <ArticleShare title={offTrackGolfDay.title} description={offTrackGolfDay.description} path={offTrackGolfDay.path} />
        </div>
        <figure className="article-figure offtrack-hero-figure"><img src={offTrackGolfDay.heroImage} width={offTrackGolfDay.heroWidth} height={offTrackGolfDay.heroHeight} alt="Torque Girl arrives at the course with her golf bag, ready to try a different kind of drive." fetchPriority="high" /><figcaption>A new course, a fresh set of choices, and room to be a beginner.</figcaption></figure>
        <div className="offtrack-chapters">
          <section className="offtrack-opening"><p className="eyebrow"><span className="eyebrow-line" />01 / Step away</p><h2>Try Something Different</h2><p>Today, the tools are lighter and the pace is slower. There’s a new course to read, a club to choose, and no need to know everything before taking the first step.</p><p>Curiosity works anywhere. Sometimes the best way to reset is to trade the workshop for a wide-open fairway.</p></section>
          <section className="offtrack-story-row"><figure className="offtrack-photo"><img src="/images/articles/golf2.webp" alt="Torque Girl focuses on her swing as the ball leaves the tee." loading="lazy" /><figcaption>Find your balance. Pick a line. Commit to the swing.</figcaption></figure><div className="offtrack-story-copy"><p className="eyebrow"><span className="eyebrow-line" />02 / Find the rhythm</p><h2>Focus on the Swing</h2><p>A good swing asks for the same things as any new skill: attention, timing, and a willingness to learn from each attempt.</p><p>One small adjustment at a time. Take a breath, trust the motion, and let the next shot be its own fresh start.</p></div></section>
          <section className="offtrack-story-row offtrack-story-row-reverse"><figure className="offtrack-photo"><img src="/images/articles/golf3.webp" alt="Torque Girl studies a club beside her golf bag on the course." loading="lazy" /><figcaption>There’s as much to enjoy between shots as there is at the tee.</figcaption></figure><div className="offtrack-story-copy"><p className="eyebrow"><span className="eyebrow-line" />03 / Take it in</p><h2>Enjoy the Walk</h2><p>The score can wait. There’s sunlight across the fairway, a little more room to think, and a new view at every turn.</p><p>Not every good day has to be measured in speed or numbers. Sometimes it’s enough to show up, keep moving, and enjoy the walk.</p></div></section>
          <blockquote className="offtrack-quote"><p>“Stay curious. Try things you&apos;re not good at yet.”</p><cite>— Torque Girl</cite></blockquote>
          <div className="offtrack-return"><Link className="text-link" href="/off-track">More Off Track stories <span aria-hidden="true">↗</span></Link></div>
        </div>
      </div>
    </article>
    <SiteFooter />
  </main>;
}
