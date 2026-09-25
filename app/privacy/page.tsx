import type { Metadata } from "next";
import Link from "next/link";
import { HomeLink } from "../../components/home-link";

export const metadata: Metadata = {
  title: "Privacy Policy | TorqueGirl",
  description: "How TorqueGirl handles website usage information, analytics, cookies and external links.",
  alternates: { canonical: "https://torquegirl.com/privacy" },
};

export default function PrivacyPage() {
  return <main className="site-shell article-shell">
    <header className="site-header article-header"><HomeLink className="brand" ariaLabel="TorqueGirl home"><span className="brand-mark">T</span><span>Torque<span>Girl</span><b>.com</b></span></HomeLink><nav className="nav-links article-nav" aria-label="Main navigation"><HomeLink>Home</HomeLink><Link href="/engines">Engines</Link><Link href="/#explore">Machines</Link><Link href="/#how-it-works">Learn</Link><Link href="/#about">About</Link><Link className="nav-off-track" href="/off-track">Off Track</Link></nav></header>
    <article className="legal-page"><header className="legal-intro"><p className="eyebrow"><span className="eyebrow-line" />TorqueGirl / policy</p><h1>Privacy</h1><p>TorqueGirl is an English-language editorial website about machines, performance and engineering. This page explains the information that may be processed when you visit the site.</p><p className="legal-updated">Last updated: September 26, 2026</p></header><div className="legal-body">
      <h2>Website usage</h2><p>You can read TorqueGirl content without creating an account or submitting personal information. We do not intentionally ask visitors to provide sensitive personal information through this website.</p>
      <h2>Local OBD2 log analysis</h2><p>The <Link href="/tools/obd2-log-analyzer">OBD2 Log Analyzer</Link> processes imported logs and comparisons in your browser memory. It does not upload log contents, vehicle readings or comparison results. Mapping templates are saved locally only when you explicitly choose to save them, and contain mapping configuration rather than recorded log samples. You can delete templates in the tool or clear browser storage.</p>
      <h2>Analytics</h2><p>TorqueGirl may use analytics tools to understand general website usage, such as which pages are visited, approximate device or browser information, and broad performance signals. Analytics help us improve editorial structure, accessibility and site performance.</p>
      <h2>Cookies and similar technologies</h2><p>The site or its analytics and hosting providers may use cookies, local storage or similar technologies needed for basic operation, security, measurement or performance. You can manage cookies through your browser settings. Disabling some technologies may affect parts of the browsing experience.</p>
      <h2>Hosting infrastructure</h2><p>Hosting and security infrastructure may automatically process technical information such as IP address, request time, user agent, referrer, response status and security events. This information is used to deliver, protect and troubleshoot the website.</p>
      <h2>External links</h2><p>TorqueGirl links to external sources, manufacturers, motorsport organizations and other websites for technical context. Those websites have their own policies and practices. We are not responsible for the privacy practices or content of third-party sites.</p>
      <h2>Future affiliate links</h2><p>TorqueGirl may add affiliate links in the future. If that happens, the destination site may receive information about the click or purchase according to its own privacy policy. Affiliate relationships will not change the editorial purpose of this website.</p>
      <h2>Data retention and choices</h2><p>Retention periods depend on the hosting, analytics and security services involved. You may limit cookies through browser controls and may contact us at <a href="mailto:hello@torquegirl.com">hello@torquegirl.com</a> with a privacy question.</p>
      <h2>Policy updates</h2><p>We may update this policy when the website, analytics, hosting or legal requirements change. The updated version will be published on this page with a new date.</p>
      <p className="legal-note">This policy is general website information and is not legal advice.</p>
    </div></article>
    <footer className="site-footer"><div className="footer-top"><HomeLink className="brand brand-footer"><span className="brand-mark">T</span><span>Torque<span>Girl</span><b>.com</b></span></HomeLink><p>Machines. Performance. Real engineering.</p></div><div className="footer-bottom"><nav aria-label="Footer navigation"><Link href="/engines">Engines</Link><Link href="/technology">Technology</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="mailto:hello@torquegirl.com">Contact</a></nav><div className="footer-meta"><span>© 2026 TorqueGirl</span><span>English only</span></div></div></footer>
  </main>;
}
