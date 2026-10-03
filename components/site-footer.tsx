import DocumentLink from './document-link';
import SiteBrand from './site-brand';
import { siteDestinations } from '../lib/site-navigation';

export default function SiteFooter({ analyzer = false }: { analyzer?: boolean }) {
  return <footer className={`site-footer shared-footer${analyzer ? ' shared-footer--analyzer' : ''}`}>
    <div className="footer-top"><SiteBrand footer /><p>Machines. Performance. Real engineering.</p></div>
    <div className="footer-bottom"><nav aria-label="Footer navigation">
      {siteDestinations.map(({ label, href }) => <DocumentLink key={href} href={href}>{label}</DocumentLink>)}
      <DocumentLink href="/privacy">Privacy</DocumentLink><DocumentLink href="/terms">Terms</DocumentLink><DocumentLink href="mailto:hello@torquegirl.com">Contact</DocumentLink>
    </nav><div className="footer-meta"><span>© {new Date().getFullYear()} TorqueGirl</span><span>English only</span></div></div>
  </footer>;
}
