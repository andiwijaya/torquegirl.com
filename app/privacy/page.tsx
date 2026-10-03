import SiteHeader from '../../components/site-header';
import SiteFooter from '../../components/site-footer';
import type { Metadata } from "next";
import Link from '../../components/document-link';

export const metadata: Metadata = {
  title: "Privacy Policy | TorqueGirl",
  description: "How TorqueGirl handles browser-local logs, observation notes and backups, tool calculations, website analytics and hosting information.",
  alternates: { canonical: "https://torquegirl.com/privacy" },
};

export default function PrivacyPage() {
  return <main className="site-shell article-shell">
    <SiteHeader />
    <article className="legal-page"><header className="legal-intro"><p className="eyebrow"><span className="eyebrow-line" />TorqueGirl / policy</p><h1>Privacy</h1><p>TorqueGirl publishes English-language engineering stories and browser-local tools. This page explains the information that may be processed when you visit the site.</p><p className="legal-updated">Last updated: October 3, 2026</p></header><div className="legal-body">
      <h2>Website usage</h2><p>You can read TorqueGirl content without creating an account or submitting personal information. We do not intentionally ask visitors to provide sensitive personal information through this website.</p>
      <h2>Local OBD2 log analysis</h2><p>The <Link href="/tools/obd2-log-analyzer">OBD2 Log Analyzer</Link> processes imported logs and comparisons in your browser memory. It does not upload log contents, vehicle readings or comparison results. Mapping templates are saved locally only when you explicitly choose to save them, and contain mapping configuration rather than recorded log samples. You can delete templates in the tool or clear browser storage. Leaving or reloading the analyzer clears raw logs and the analysis session; returning starts a new analysis.</p>
      <h2>Local observation and retest notes</h2><p>The analyzer’s <Link href="/tools/obd2-log-analyzer#observation-notebook">observation notebook</Link> persists notes only through an explicit save or a reviewed backup import. Browser localStorage holds your optional text, identifiers and retest notes, plus any compact evidence snapshot you choose to capture, review and save: run labels, selected elapsed region or phase, signal labels, summary statistics and comparison summaries. Raw logs, source rows, sample arrays, traces and analysis sessions are never saved or restored. Importing a log or capturing evidence alone does not save a note.</p><p>Saved notes are limited to this site’s origin in this browser; there is no account or cloud sync. You can edit, delete or clear saved notes in the analyzer. Browser data clearing, storage limits or private browsing may make saving unavailable or remove notes. Safe saving requires browser Web Locks; when unavailable, saved notes are read/export only and drafts stay in memory.</p><p>Download notebook backup creates a local JSON file of saved notes; unsaved edits need the separate draft backup action. Import validates a backup before applying a merge or a confirmed replacement. Backups may contain private identifiers and observations. Keep your own copies and control where you store or share them. These files preserve notes and compact evidence, not raw logs or a reloadable session. Keep original logs separately. Share Tool shares only the public tool URL.</p>
      <h2>Local torque and power calculations</h2><p>The <Link href="/tools/torque-power-explorer">Torque-Power Explorer</Link> calculates in browser memory. Point values and pasted curve samples are not uploaded or saved by the tool; leaving or reloading clears them.</p>
      <h2>Analytics</h2><p>The OBD2 Log Analyzer, its notebook and the Torque-Power Explorer do not initialize site analytics. Tool inputs, imported logs and notebook contents are not sent as analytics events. Ordinary editorial pages and the Tools index may use analytics. </p><p>TorqueGirl may use analytics tools to understand general website usage, such as which pages are visited, approximate device or browser information, and broad performance signals. Analytics help us improve editorial structure, accessibility and site performance.</p>
      <h2>Cookies and similar technologies</h2><p>The site or its analytics and hosting providers may use cookies, local storage or similar technologies needed for basic operation, security, measurement or performance. You can manage cookies through your browser settings. Disabling some technologies may affect parts of the browsing experience.</p>
      <h2>Hosting infrastructure</h2><p>Hosting and security infrastructure may automatically process technical information such as IP address, request time, user agent, referrer, response status and security events. This information is used to deliver, protect and troubleshoot the website.</p>
      <h2>External links</h2><p>TorqueGirl links to external sources, manufacturers, motorsport organizations and other websites for technical context. Those websites have their own policies and practices. We are not responsible for the privacy practices or content of third-party sites.</p>
      <h2>Future affiliate links</h2><p>TorqueGirl may add affiliate links in the future. If that happens, the destination site may receive information about the click or purchase according to its own privacy policy. Affiliate relationships will not change the editorial purpose of this website.</p>
      <h2>Data retention and choices</h2><p>Retention periods depend on the hosting, analytics and security services involved. You may limit cookies through browser controls and may contact us at <a href="mailto:hello@torquegirl.com">hello@torquegirl.com</a> with a privacy question.</p>
      <h2>Policy updates</h2><p>We may update this policy when the website, analytics, hosting or legal requirements change. The updated version will be published on this page with a new date.</p>
      <p className="legal-note">This policy is general website information and is not legal advice.</p>
    </div></article>
    <SiteFooter />
  </main>;
}
