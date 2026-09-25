import type { Metadata } from "next";
import Link from '../../components/document-link';
import { HomeLink } from "../../components/home-link";

export const metadata: Metadata = {
  title: "Terms of Use | TorqueGirl",
  description: "Terms of use for TorqueGirl editorial content about automotive technology and engineering.",
  alternates: { canonical: "https://torquegirl.com/terms" },
};

export default function TermsPage() {
  return <main className="site-shell article-shell">
    <header className="site-header article-header"><HomeLink className="brand" ariaLabel="TorqueGirl home"><span className="brand-mark">T</span><span>Torque<span>Girl</span><b>.com</b></span></HomeLink><nav className="nav-links article-nav" aria-label="Main navigation"><HomeLink>Home</HomeLink><Link href="/engines">Engines</Link><Link href="/#explore">Machines</Link><Link href="/#how-it-works">Learn</Link><Link href="/#about">About</Link><Link className="nav-off-track" href="/off-track">Off Track</Link></nav></header>
    <article className="legal-page"><header className="legal-intro"><p className="eyebrow"><span className="eyebrow-line" />TorqueGirl / policy</p><h1>Terms</h1><p>These terms describe the basic conditions for using TorqueGirl, an English-language editorial website about machines, performance and engineering.</p><p className="legal-updated">Last updated: September 22, 2026</p></header><div className="legal-body">
      <h2>Informational purpose</h2><p>TorqueGirl content is provided for general informational and educational purposes. Articles are intended to make engineering easier to understand and are not a substitute for professional advice, inspection, testing or the official documentation for a specific vehicle or component.</p>
      <h2>No mechanical or engineering warranty</h2><p>Technical explanations may contain errors, omissions or information that is not suitable for a particular application. Do not rely on an article as a repair procedure, design approval, safety certification, race-eligibility decision or guarantee of performance.</p>
      <h2>Your responsibility</h2><p>You are responsible for deciding whether information is appropriate for your vehicle, project, environment and applicable laws. Follow manufacturer instructions, motorsport regulations, workshop safety procedures and qualified professional advice before working on machinery.</p>
      <h2>Intellectual property</h2><p>TorqueGirl editorial text, design, branding, graphics and original imagery are protected by applicable intellectual-property laws. You may link to public pages for ordinary reference. Do not republish substantial content, remove attribution, scrape the site or use TorqueGirl branding without permission.</p>
      <h2>Third-party websites</h2><p>The site may link to external manufacturers, organizations, tools and publications. Those websites are outside TorqueGirl&apos;s control, and visiting them is subject to their own terms, privacy policies and security practices.</p>
      <h2>Future affiliate relationships</h2><p>TorqueGirl may use affiliate links in the future. An affiliate link may result in a commission if you choose to purchase through a third party. It does not create a warranty, endorsement or direct service relationship between TorqueGirl and the purchaser.</p>
      <h2>Limitation of liability</h2><p>To the fullest extent permitted by applicable law, TorqueGirl is not responsible for loss, damage, injury, downtime or expense arising from reliance on editorial content, linked websites, project decisions or use of machinery. You use information from the site at your own judgment and risk.</p>
      <h2>Changes to these terms</h2><p>We may update these terms when the website or its services change. The current version will be published on this page with a new date. Continued use of the site after an update means you accept the revised terms to the extent permitted by law.</p>
      <p className="legal-note">These terms are general website terms and are not legal advice.</p>
    </div></article>
    <footer className="site-footer"><div className="footer-top"><HomeLink className="brand brand-footer"><span className="brand-mark">T</span><span>Torque<span>Girl</span><b>.com</b></span></HomeLink><p>Machines. Performance. Real engineering.</p></div><div className="footer-bottom"><nav aria-label="Footer navigation"><Link href="/engines">Engines</Link><Link href="/technology">Technology</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="mailto:hello@torquegirl.com">Contact</a></nav><div className="footer-meta"><span>© 2026 TorqueGirl</span><span>English only</span></div></div></footer>
  </main>;
}
