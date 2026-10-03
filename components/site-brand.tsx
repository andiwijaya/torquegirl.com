import DocumentLink from './document-link';

export default function SiteBrand({ footer = false }: { footer?: boolean }) {
  return <DocumentLink className={footer ? 'brand brand-footer' : 'brand'} href="/" aria-label="TorqueGirl home">
    <span className="brand-mark">T</span><span>Torque<span>Girl</span><b>.com</b></span>
  </DocumentLink>;
}
