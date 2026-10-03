'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import DocumentLink from './document-link';
import SiteBrand from './site-brand';
import { siteDestinations, type SiteDestination } from '../lib/site-navigation';

export default function SiteHeader({ active, analyzer = false }: { active?: SiteDestination; analyzer?: boolean }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
      }
    }
    function outside(event: Event) {
      if (event.target instanceof Node && !header.current?.contains(event.target)) setOpen(false);
    }
    function resize() { if (window.matchMedia('(min-width: 961px)').matches) setOpen(false); }
    document.addEventListener('keydown', escape);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    window.addEventListener('resize', resize);
    return () => {
      document.removeEventListener('keydown', escape);
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      window.removeEventListener('resize', resize);
    };
  }, [open]);

  return <header ref={header} className={`site-header shared-header${analyzer ? ' shared-header--analyzer' : ''}`}>
    <div className="site-brand-group"><SiteBrand />{analyzer && <span className="site-local-badge">LOCAL / PRIVATE</span>}</div>
    <button ref={toggle} type="button" className="site-menu-toggle" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(!open)}>
      {open ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
    </button>
    <nav id={menuId} className={`site-navigation${open ? ' is-open' : ''}`} aria-label="Main navigation">
      {siteDestinations.map(({ label, href }) => <DocumentLink key={href} href={href} aria-current={active === label ? 'page' : undefined} onClick={() => {
        setOpen(false);
        // Same-document anchors should leave focus at the destination after the menu closes.
        if (href === '/#about' && window.location.pathname === '/') document.getElementById('about')?.focus({ preventScroll: true });
      }}>{label}</DocumentLink>)}
    </nav>
  </header>;
}
