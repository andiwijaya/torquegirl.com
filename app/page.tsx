import { ArrowUpRight } from 'lucide-react';
import SiteHeader from '../components/site-header';
import SiteFooter from '../components/site-footer';
import DocumentLink from '../components/document-link';
import { getLatestArticles, nascarV8Article, turboVsSuperchargerArticle, toyota2JzArticle, formulaDownforceArticle, obd2Article, obd2ComparisonArticle, obd2DtcArticle, obd2LiveDataArticle, offTrackGolfDay, type ArticleSummary } from '../lib/torquegirl-content';

export const metadata = {
  title: 'TorqueGirl - Learn Engineering, Analyze Data, Explore Machines',
  description: 'Learn how engines and automotive technology work. Analyze OBD2 logs locally, and explore the engineering behind powerful machines with TorqueGirl.',
  alternates: { canonical: 'https://torquegirl.com' },
  openGraph: { type: 'website', siteName: 'TorqueGirl', title: 'TorqueGirl - Power, decoded.', description: 'Learn engineering. Analyze your recorded data. Explore extraordinary machines.', url: 'https://torquegirl.com', images: [{ url: 'https://torquegirl.com/torque-girl-hero.png', width: 1024, height: 1536, alt: 'TorqueGirl beside a race car' }] },
  twitter: { card: 'summary_large_image', title: 'TorqueGirl - Power, decoded.', description: 'Learn engineering. Analyze your recorded data. Explore extraordinary machines.', images: ['https://torquegirl.com/torque-girl-hero.png'] },
};

function Feature({ id, label, article }: { id?: string; label: string; article: ArticleSummary }) {
  return <section className={`section featured-section${article.category === 'Off Track' ? ' offtrack-home-feature' : ''}`} id={id}>
    <div className="featured-art featured-article-art"><img src={article.heroImage} alt={article.heroAlt} loading="lazy" /></div>
    <div className="featured-copy"><p className="eyebrow"><span className="eyebrow-line" />{label}</p><h2>{article.title}</h2><p>{article.description}</p><DocumentLink className="text-link" href={article.path}>Read the story <ArrowUpRight size={16} aria-hidden="true" /></DocumentLink></div>
  </section>;
}

export default function Home() {
  return <main className="site-shell home-page">
    <SiteHeader active="Home" />
    <section className="hero" id="top">
      <div className="hero-copy"><p className="eyebrow"><span className="eyebrow-line" />Power, decoded.</p><h1>Explore machines. Make sense of data.</h1><p className="hero-intro">Learn the engineering behind powerful engines and racing machines. Analyze your recorded sensor data. Follow the details that make performance possible.</p><div className="hero-actions"><DocumentLink className="button button-dark" href="#explore">Explore engineering <ArrowUpRight size={17} aria-hidden="true" /></DocumentLink><DocumentLink className="button button-outline" href="/tools/obd2-log-analyzer">Analyze an OBD2 log</DocumentLink></div><p className="scroll-note"><span className="scroll-bar" />Learn / Analyze / Explore</p></div>
      <div className="hero-visual"><div className="hero-grid" /><div className="hero-label label-top">TG / 001 <span>↗</span></div><div className="hero-label label-bottom">MACHINES / PERFORMANCE / ENGINEERING</div><div className="image-frame"><img src="/torque-girl-hero.png" alt="TorqueGirl standing beside a high-performance race car" fetchPriority="high" /></div></div>
    </section>
    <section className="section explore-section" id="explore" aria-labelledby="explore-heading">
      <div className="section-heading"><div><p className="eyebrow"><span className="eyebrow-line" />The TorqueGirl index</p><h2 id="explore-heading">Curiosity starts here.</h2></div><p>From a clear explanation to a closer look at your own data. Choose the question that brings you here.</p></div>
      <div className="category-grid">
        <DocumentLink className="category-card" href="/technology"><span className="category-number">01 / LEARN</span><span className="category-title">Learn <ArrowUpRight size={18} aria-hidden="true" /></span><span className="category-body">Understand airflow, sensors and OBD2. Build context before drawing conclusions.</span></DocumentLink>
        <DocumentLink className="category-card" href="/tools/obd2-log-analyzer"><span className="category-number">02 / ANALYZE</span><span className="category-title">Analyze <ArrowUpRight size={18} aria-hidden="true" /></span><span className="category-body">Inspect recorded signals, compare runs and find patterns. Your logs stay in your browser.</span></DocumentLink>
        <DocumentLink className="category-card" href="/engines"><span className="category-number">03 / EXPLORE</span><span className="category-title">Explore <ArrowUpRight size={18} aria-hidden="true" /></span><span className="category-body">Meet legendary engines and race-bred machines through the engineering that makes them work.</span></DocumentLink>
      </div>
    </section>
    <section className="section tools-spotlight" id="tools" aria-labelledby="tools-heading">
      <div><p className="eyebrow light"><span className="eyebrow-line" />TorqueGirl Tools / Local analysis</p><h2 id="tools-heading">Your drive. Your data. A clearer picture.</h2><p>Open the OBD2 Log Analyzer to inspect synchronized signals, recording quality and driving phases. Compare Run A and Run B, or try the synthetic demo to get started.</p><p className="tool-principle">Find patterns first. Diagnose second.</p><div className="hero-actions"><DocumentLink className="button button-light" href="/tools/obd2-log-analyzer">Open OBD2 Log Analyzer <ArrowUpRight size={17} aria-hidden="true" /></DocumentLink><DocumentLink className="text-link" href="/tools">Explore Tools <ArrowUpRight size={16} aria-hidden="true" /></DocumentLink></div></div>
      <div className="tools-context"><span>NO LOG UPLOAD</span><p>Your vehicle logs remain local to this browser. The analyzer helps you observe recorded data; it does not diagnose a mechanical fault.</p><DocumentLink className="text-link" href={obd2LiveDataArticle.path}>Learn to read live data <ArrowUpRight size={16} aria-hidden="true" /></DocumentLink></div>
    </section>
    <section className="section home-latest" id="latest" aria-labelledby="latest-heading">
      <div className="section-heading"><div><p className="eyebrow"><span className="eyebrow-line" />Latest stories</p><h2 id="latest-heading">Fresh from TorqueGirl.</h2></div><p>The newest published stories across engineering, technology and Off Track.</p></div>
      <div className="latest-grid">{getLatestArticles().map(article => <DocumentLink className="latest-card" href={article.path} key={article.path}><img src={article.heroImage} alt={article.heroAlt} loading="lazy" /><div className="latest-meta"><span>{article.category}</span><time dateTime={article.date}>{article.date}</time></div><h3>{article.title}</h3><p>{article.description}</p><span className="text-link">Read the story <ArrowUpRight size={16} aria-hidden="true" /></span></DocumentLink>)}</div>
    </section>
    <section className="section scope-section" id="how-it-works"><div className="scope-intro"><p className="eyebrow light"><span className="eyebrow-line" />What we explore</p><h2>The difference is in the details.</h2><p>TorqueGirl is a field guide to the choices, compromises and clever solutions inside extraordinary machines.</p></div><div className="scope-list"><div className="scope-item"><span>01</span><strong>Where power comes from</strong></div><div className="scope-item"><span>02</span><strong>How machines transfer power</strong></div><div className="scope-item"><span>03</span><strong>Why racing machines are engineered differently</strong></div><div className="scope-item"><span>04</span><strong>Materials, aerodynamics and cooling</strong></div><div className="scope-item"><span>05</span><strong>Mechanical trade-offs</strong></div><div className="scope-item"><span>06</span><strong>Performance and efficiency</strong></div></div></section>
    <Feature id="featured" label="Featured machine" article={nascarV8Article} />
    <Feature label="Boost explained" article={turboVsSuperchargerArticle} />
    <Feature id="engine-legends" label="Engine legends" article={toyota2JzArticle} />
    <Feature id="technology" label="Technology" article={formulaDownforceArticle} />
    <Feature id="obd2" label="Garage technology" article={obd2Article} />
    <Feature id="obd2-comparison" label="Diagnostic tools" article={obd2ComparisonArticle} />
    <Feature id="obd2-codes" label="Diagnostic codes" article={obd2DtcArticle} />
    <Feature id="obd2-live-data" label="Live data / diagnostic workflow" article={obd2LiveDataArticle} />
    <Feature label="Torque Girl / Off Track" article={offTrackGolfDay} />
    <section className="about-section" id="about" tabIndex={-1}><div className="about-image"><img src="/torque-girl-hero.png" alt="TorqueGirl in a race paddock" loading="lazy" /></div><div className="about-copy"><p className="eyebrow"><span className="eyebrow-line" />Meet TorqueGirl</p><h2>Your guide to the machinery behind the spectacle.</h2><p>TorqueGirl makes complex engineering easier to see, hear and understand. Learn how a system works, explore the evidence and keep your curiosity moving.</p></div></section>
    <section className="follow-section" id="follow"><div><p className="eyebrow light"><span className="eyebrow-line" />Follow the build</p><h2>Breakdowns, comparisons and machine stories.</h2></div><DocumentLink className="button button-light" href="mailto:hello@torquegirl.com">Get in touch <ArrowUpRight size={17} aria-hidden="true" /></DocumentLink></section>
    <SiteFooter />
  </main>;
}
