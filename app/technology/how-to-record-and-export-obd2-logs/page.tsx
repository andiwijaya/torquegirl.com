import type { Metadata } from 'next';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import SiteHeader from '../../../components/site-header';
import SiteFooter from '../../../components/site-footer';
import DocumentLink from '../../../components/document-link';
import { ArticleShare } from '../../../components/article-share';
import { obd2RecordingArticle as article } from '../../../lib/torquegirl-content';

const articleUrl = `https://torquegirl.com${article.path}`;
export const metadata: Metadata = {
  title: article.title,
  description: article.description,
  alternates: { canonical: articleUrl },
  openGraph: { type: 'article', url: articleUrl, title: `${article.title} | TorqueGirl`, description: article.description, publishedTime: article.date, modifiedTime: article.updatedDate ?? article.date, images: [{ url: `https://torquegirl.com${article.heroImage}`, width: 1672, height: 944, alt: article.heroAlt }] },
  twitter: { card: 'summary_large_image', title: `${article.title} | TorqueGirl`, description: article.description, images: [`https://torquegirl.com${article.heroImage}`] },
};

export default function RecordingGuide() {
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Article', headline: article.title, description: article.description, image: [`https://torquegirl.com${article.heroImage}`], datePublished: article.date, dateModified: article.updatedDate ?? article.date, mainEntityOfPage: articleUrl, publisher: { '@type': 'Organization', name: 'TorqueGirl', url: 'https://torquegirl.com' } };
  return <main className="site-shell article-shell">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <SiteHeader active="Technology" />
    <article className="technical-article">
      <header className="article-intro">
        <DocumentLink className="back-link" href="/technology"><ArrowLeft size={15} aria-hidden="true" /> Technology</DocumentLink>
        <div className="article-kicker"><span>TECHNOLOGY</span><span>DATA LOGGING</span><span>{article.readingTime}</span></div>
        <h1>{article.title}</h1>
        <p className="article-dek">A useful log starts with a clear question. Record the context, keep the original evidence, and bring a readable file to the analyzer.</p>
        <div className="article-byline"><span>TorqueGirl editorial</span><time dateTime={article.date}>October 3, 2026</time></div>
        <ArticleShare title={article.title} description={article.description} path={article.path} />
      </header>
      <figure className="article-figure wide-technical log-figure"><img src={article.heroImage} alt={article.heroAlt} width="1672" height="944" loading="eager" fetchPriority="high" /><figcaption>Prepare the scanner and logging device while parked. A focused recording is easier to interpret when you know its conditions.</figcaption></figure>
      <div className="article-layout"><aside className="article-rail"><span>01</span><span>PREPARE / RECORD / EXPORT</span></aside><div className="article-body">
        <p className="lead-paragraph">You do not need every available sensor or an aggressive road test. You need enough relevant data to see what happened before, during and after the event you want to understand.</p>
        <p>New to this? Start with <DocumentLink className="inline-article-link" href="/technology/how-to-analyze-obd2-live-data-and-logs">how to analyze OBD2 live data and logs</DocumentLink>. If your tool only reads codes, check <DocumentLink className="inline-article-link" href="/technology/obd2-scanner-vs-code-reader">scanner versus code reader capabilities</DocumentLink>: live display, recording and text export are separate features. Confirm each in your exact tool&apos;s documentation.</p>

        <h2 id="safe-setup">Set up while parked</h2>
        <ul className="decision-list">
          <li>Connect and configure the scanner, choose channels, secure cables away from pedals and controls, and verify that recording works before moving.</li>
          <li>Do not operate a phone, scanner or computer while driving. Use a passenger to operate it, or securely mounted, unattended logging configured while parked. Stop safely before changing settings or checking a file.</li>
          <li>A stationary idle recording may answer your question. Run an engine only with suitable ventilation; never in an enclosed garage. Follow the vehicle and tool instructions for securing the vehicle.</li>
          <li>If a normal lawful drive is appropriate, let traffic and road conditions determine it. Do not perform hard pulls, sudden braking, deliberate swerves or other risky maneuvers to create a graph. Leave tests requiring controlled conditions to a qualified technician.</li>
        </ul>

        <h2 id="channels">Choose a small channel set</h2>
        <p>A PID (parameter ID) identifies a reported parameter. Select supported channels that answer one question, plus the context needed to interpret them. A missing or unsupported PID is not evidence of a faulty sensor. Confirm labels, units and bank/sensor numbers in the tool and vehicle information.</p>
        <div className="recap-grid">
          <div className="recap-item"><strong>Operating context</strong><p>RPM, vehicle speed, coolant temperature and a clearly identified throttle or accelerator channel, where supported.</p></div>
          <div className="recap-item"><strong>Fuel-control question</strong><p>Add relevant STFT/LTFT banks and supported oxygen or air-fuel channels. Keep banks distinct; a trim value alone does not name a failed part.</p></div>
          <div className="recap-item"><strong>Air or load question</strong><p>Add supported airflow, manifold pressure or calculated load if relevant. Keep absolute pressure distinct from boost or gauge pressure.</p></div>
          <div className="recap-item"><strong>Before recording</strong><p>Save relevant codes and freeze-frame information separately. Do not clear codes or reset learned values just to make a cleaner baseline.</p></div>
        </div>
        <p>Try a short parked capture, export it, and inspect its headers and time column. This checks the whole path before you invest in a longer recording.</p>

        <h2 id="conditions">Record the conditions</h2>
        <p>Keep a separate note with the question, date, engine state, selected channels, units, app/tool version and any recent change. Add ambient conditions, accessory load or road grade when relevant. For a later comparison, aim for similar safe conditions and record what differed.</p>
        <ol className="obd2-step-list">
          <li><strong>Cold or warming up:</strong> note how long the engine was off and the starting coolant reading. If cold behavior is the question, capture from startup where the tool permits. Do not call a recently stopped engine cold.</li>
          <li><strong>Warm idle:</strong> record the observed temperature, accessory use and a settled interval. Compare with vehicle-specific warm-up guidance; one coolant value does not prove every system is fully warm.</li>
          <li><strong>Steady cruise:</strong> if it occurs safely during an ordinary drive, note speed, gear where known, grade and changing load. A brief stable region is easier to compare than an entire mixed drive.</li>
          <li><strong>Acceleration and deceleration:</strong> capture ordinary transitions only when they occur safely. Note the context around them; throttle position, fuel control and sensor refresh can differ from steady operation.</li>
        </ol>
        <p>You do not need all four conditions in one file. As a planning example, a few minutes of settled idle may suit an idle question; a warm-up question needs the relevant warm-up period. Include a stable lead-in and time after an event, then stop once the question is captured. There is no universal duration that guarantees a useful result. If nothing happened, record that too.</p>

        <h2 id="cadence">Understand the update rate</h2>
        <p>Cadence is the spacing between samples. More selected channels can reduce how often each is refreshed. A slow temperature trend and a brief throttle transition have different timing needs; test your selected set and inspect the actual sample spacing rather than assuming a requested rate was achieved.</p>
        <p>A fixed file-writing interval can repeat the latest value before a fresh reply arrives. A row timestamp does not guarantee that every channel was measured simultaneously. Gaps, repeated or stale readings and uneven polling can change how a relationship looks. Do not interpolate extra readings to make the data appear faster.</p>
        <p className="comparison-note">OBDLink&apos;s <a className="inline-article-link" href="https://support.obdlink.com/support/solutions/articles/43000709894-get-started-with-logs" rel="noreferrer">logging documentation</a> describes channel-count and fixed-interval tradeoffs. Treat that as an example of why settings matter, not a promise that every app works the same way.</p>

        <h2 id="time-units">Keep time and units intact</h2>
        <ul className="decision-list">
          <li>Keep the original time column, row order and precision. Elapsed seconds and milliseconds need an explicit unit; a bare numeric time column needs a deliberate choice in import preview.</li>
          <li>For full dates, prefer an exporter-supported ISO date/time with its UTC offset or Z marker. Note the original timezone separately if absent. TorqueGirl interprets offset-free ISO values as UTC, not the browser&apos;s local timezone; do not silently relabel local time as UTC.</li>
          <li>Clock-only HH:MM:SS values lack a date and timezone. Note the session date and any midnight crossing separately; inspect the preview for time-order issues before using it.</li>
          <li>Keep units such as RPM, km/h or mph, °C or °F, %, kPa or psi and g/s. Header units in parentheses or brackets help mapping. If absent, consult the exporter and choose the known unit in preview; do not guess from the size of a reading.</li>
        </ul>

        <h2 id="export">Export through your software</h2>
        <p>Stop and save while parked, then use the tool&apos;s documented export or save-file workflow. Choose CSV, or TSV if your software supports it. CSV commonly uses commas; locale settings may use semicolons. TSV uses tabs. Changing a filename extension does not convert a proprietary or binary recording into text.</p>
        <p>Menus and layouts vary. Some apps keep a playback file separately from a CSV export, or select logging channels separately from dashboard gauges. Verify the exported file actually contains the intended channels. Manufacturer documentation establishes those app features; it does not establish compatibility of every resulting file with TorqueGirl.</p>
        <p>TorqueGirl expects one header record, a consistent number of columns, a usable time column and sample rows. It supports comma, semicolon and tab delimiters in text CSV/TSV/TXT files. Metadata preambles, separate units rows and proprietary binary files are not supported. Prefer an appropriate exporter option; if a documented conversion is needed, work on a copy, record exactly what changed and retain the source.</p>

        <h2 id="preserve">Preserve the original evidence</h2>
        <p>Keep both the original recording and the untouched export. Avoid opening and resaving the only copy in a spreadsheet: automatic date conversion, rounding or locale changes can alter it. Inspect a copy in a plain-text viewer when checking the first rows.</p>
        <ul className="decision-list">
          <li>Do not delete inconvenient spikes, gaps or missing readings, sort rows by sensor value, fill blanks with zero, invent samples or manually resample/interpolate.</li>
          <li>Do not round values, merge banks, rename ambiguous signals to a different PID, or silently convert units and timestamps before import.</li>
          <li>Use TorqueGirl&apos;s delimiter, time, PID and unit preview to review interpretation. Investigate warnings using the original; a plausible chart does not validate an incorrect mapping.</li>
        </ul>

        <h2 id="privacy">Review privacy before sharing</h2>
        <p>Exports can contain location, VINs, vehicle labels, precise trip times or identifying filenames. Disable unnecessary location logging before recording if your app permits it. Keep originals private; if you choose to share evidence elsewhere, make a separate redacted copy and document the redaction.</p>
        <p>TorqueGirl analyzes your imported log locally in your browser without uploading it. Keep your own file backup: leaving or reloading the analyzer clears the in-memory log. Article sharing shares this guide&apos;s URL, and Share Tool shares the analyzer URL; neither attaches your log. Your scanner app&apos;s own cloud/export behavior is separate, so review its settings too.</p>

        <h2 id="analyze">I have a log. What next?</h2>
        <p>Choose the exported file, review the mapping, then analyze. Check data quality and timing before inspecting related channels in a useful region. Use the <DocumentLink className="inline-article-link" href="/tools/obd2-log-analyzer#observation-notebook">local observation notebook</DocumentLink> to record the observation, another possible explanation and a safe next verification or retest. Review any captured compact evidence before saving. Keep the original log separately: saved notes and JSON backups do not restore raw logs or the analysis session. A pattern is evidence to investigate, not an automatic diagnosis.</p>
        <div className="related-article"><span>I HAVE A LOG</span><DocumentLink href="/tools/obd2-log-analyzer"><strong>Analyze my log locally</strong><ArrowUpRight size={17} aria-hidden="true" /></DocumentLink></div>
        <aside className="torquegirl-takeaway"><span>TORQUEGIRL&apos;S QUICK TAKE</span><p>Keep the context as carefully as the numbers. Find patterns first. Diagnose second.</p></aside>
        <div className="related-article"><span>KEEP LEARNING</span><DocumentLink href="/technology/how-to-analyze-obd2-live-data-and-logs"><strong>How to Analyze OBD2 Live Data and Logs</strong><ArrowUpRight size={17} aria-hidden="true" /></DocumentLink></div>
        <div className="article-sources"><strong>Sources &amp; technical context</strong><a href="https://www.obdsol.com/knowledgebase/obd-software-development/reading-real-time-data/" rel="noreferrer">OBD Solutions: requests, real-time parameters and PIDs</a><a href="https://support.obdlink.com/support/solutions/articles/43000709894-get-started-with-logs" rel="noreferrer">OBDLink: log selection, timing, CSV and binary export differences</a><a href="https://www.obdsoftware.net/software/obdfusion" rel="noreferrer">OBD Fusion: live graphs and logged CSV files</a></div>
        <ArticleShare title={article.title} description={article.description} path={article.path} />
      </div></div>
    </article>
    <SiteFooter />
  </main>;
}
