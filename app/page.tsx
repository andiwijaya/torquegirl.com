import { ArrowUpRight } from 'lucide-react';
import SiteHeader from '../components/site-header';
import SiteFooter from '../components/site-footer';
import DocumentLink from '../components/document-link';
import { JsonLd } from '../components/seo-structured-data';
import { homeImage, pageMetadata, publisher, siteName, siteUrl } from '../lib/site-seo';
import { getLatestArticles, nascarV8Article, turboVsSuperchargerArticle, toyota2JzArticle, formulaDownforceArticle, obd2Article, obd2ComparisonArticle, obd2DtcArticle, obd2LiveDataArticle, obd2AnalyzerTool, torquePowerExplorerTool, offTrackGolfDay, type ArticleSummary } from '../lib/torquegirl-content';

export const metadata = pageMetadata({
  path: '/', title: 'Automotive Engineering & OBD2 Tools',
  description: 'Explore performance engines and motorsport technology. Learn to read OBD2 data, analyze logs in your browser, and calculate torque and power from RPM.',
});

function Feature({ id, label, article }: { id?: string; label: string; article: ArticleSummary }) {
  return <section className={`section featured-section${article.category === 'Off Track' ? ' offtrack-home-feature' : ''}`} id={id}>
    <div className="featured-art featured-article-art"><img src={article.heroImage} alt={article.heroAlt} width={article.heroWidth} height={article.heroHeight} loading="lazy" /></div>
    <div className="featured-copy"><p className="eyebrow"><span className="eyebrow-line" />{label}</p><h2>{article.title}</h2><p>{article.description}</p><DocumentLink className="text-link" href={article.path}>Read the story <ArrowUpRight size={16} aria-hidden="true" /></DocumentLink></div>
  </section>;
}

export default function Home() {
  return <main className="site-shell home-page">
    <JsonLd id="website-data" data={{ '@type': 'WebSite', name: siteName, url: siteUrl('/'), inLanguage: 'en', publisher }} />
    <SiteHeader active="Home" />
    <section className="hero" id="top">
      <div className="hero-copy"><p className="eyebrow"><span className="eyebrow-line" />Power, decoded.</p><h1>Explore automotive engineering.</h1><p className="hero-intro">See how performance engines and racing machines work. Learn to read OBD2 data, analyze your own logs, and explore the relationship between torque, power and RPM.</p><div className="hero-actions"><DocumentLink className="button button-dark" href="#explore">Explore engineering <ArrowUpRight size={17} aria-hidden="true" /></DocumentLink><DocumentLink className="button button-outline" href="/tools/obd2-log-analyzer">Analyze an OBD2 log</DocumentLink></div><p className="scroll-note"><span className="scroll-bar" />Learn / Analyze / Explore</p></div>
      <div className="hero-visual"><div className="hero-grid" /><div className="hero-label label-top">TG / 001 <span>↗</span></div><div className="hero-label label-bottom">MACHINES / PERFORMANCE / ENGINEERING</div><div className="image-frame"><img src={homeImage.url} srcSet={`/torque-girl-hero-640.webp 640w, ${homeImage.url} 1024w`} sizes="(max-width: 760px) 100vw, 50vw" alt={homeImage.alt} width={homeImage.width} height={homeImage.height} fetchPriority="high" /></div></div>
    </section>
    <section className="section explore-section" id="explore" aria-labelledby="explore-heading">
      <div className="section-heading"><div><p className="eyebrow"><span className="eyebrow-line" />The TorqueGirl index</p><h2 id="explore-heading">Curiosity starts here.</h2></div><p>From a clear explanation to a closer look at your own data. Choose the question that brings you here.</p></div>
      <div className="category-grid">
        <DocumentLink className="category-card" href="/technology"><span className="category-number">01 / LEARN</span><span className="category-title">Learn <ArrowUpRight size={18} aria-hidden="true" /></span><span className="category-body">Understand airflow, sensors and OBD2. Build context before drawing conclusions.</span></DocumentLink>
        <DocumentLink className="category-card" href={obd2AnalyzerTool.path}><span className="category-number">02 / ANALYZE</span><span className="category-title">Analyze <ArrowUpRight size={18} aria-hidden="true" /></span><span className="category-body">Inspect signals, compare runs and keep local observations for your next test. Your logs stay in your browser.</span></DocumentLink>
        <DocumentLink className="category-card" href={torquePowerExplorerTool.path}><span className="category-number">03 / EXPLORE</span><span className="category-title">Explore <ArrowUpRight size={18} aria-hidden="true" /></span><span className="category-body">Connect torque, power and RPM. Calculate a point or explore supplied curve samples alongside our engine stories.</span></DocumentLink>
      </div>
    </section>
    <section className="section tools-spotlight" id="tools" aria-labelledby="tools-heading">
      <div><p className="eyebrow light"><span className="eyebrow-line" />TorqueGirl Tools / Local analysis</p><h2 id="tools-heading">Your drive. Your data. A clearer picture.</h2><p>Open the OBD2 Log Analyzer to inspect synchronized signals, recording quality and driving phases. Compare Run A and Run B, or try the synthetic demo and first-use guide. Save observations and next tests in the local notebook; saved notes do not restore logs or an analysis session.</p><p className="tool-principle">Find patterns first. Diagnose second.</p><div className="hero-actions"><DocumentLink className="button button-light" href={obd2AnalyzerTool.path}>Open {obd2AnalyzerTool.title} <ArrowUpRight size={17} aria-hidden="true" /></DocumentLink><DocumentLink className="text-link" href="/tools">Explore Tools <ArrowUpRight size={16} aria-hidden="true" /></DocumentLink></div><DocumentLink className="text-link" href={obd2LiveDataArticle.path}>Learn to read live data <ArrowUpRight size={16} aria-hidden="true" /></DocumentLink></div>
      <div className="tools-context"><span>TORQUE / POWER / RPM</span><h3>{torquePowerExplorerTool.title}</h3><p>{torquePowerExplorerTool.description} Use the synthetic sample to explore the relationship, with no actual engine prediction.</p><DocumentLink className="text-link" href={torquePowerExplorerTool.path}>Open {torquePowerExplorerTool.title} <ArrowUpRight size={16} aria-hidden="true" /></DocumentLink></div>
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
    <section className="about-section" id="about" tabIndex={-1}><div className="about-image"><img src="/torque-girl-hero-640.webp" alt={homeImage.alt} width="640" height="960" loading="lazy" /></div><div className="about-copy"><p className="eyebrow"><span className="eyebrow-line" />Meet TorqueGirl</p><h2>Your guide to the machinery behind the spectacle.</h2><p>TorqueGirl makes complex engineering easier to see, hear and understand. Learn how a system works, explore the evidence and keep your curiosity moving.</p></div></section>
    <section className="follow-section" id="follow"><div><p className="eyebrow light"><span className="eyebrow-line" />Follow the build</p><h2>Breakdowns, comparisons and machine stories.</h2></div><DocumentLink className="button button-light" href="mailto:hello@torquegirl.com">Get in touch <ArrowUpRight size={17} aria-hidden="true" /></DocumentLink></section>
    <SiteFooter />
  </main>;
}
