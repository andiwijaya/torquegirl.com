import type { Metadata } from 'next';
import SiteHeader from '../../../components/site-header';
import SiteFooter from '../../../components/site-footer';
import Explorer from '../../../components/torque-power/explorer';
import './style.css';

const url = 'https://torquegirl.com/tools/torque-power-explorer';
const description = 'Calculate torque and power with RPM, Nm, lb-ft, kW and mechanical hp. Explore supplied curve samples locally with labelled plots and numeric readouts.';
export const metadata: Metadata = {
  title: 'Torque–Power Explorer', description, alternates: { canonical: url },
  openGraph: { title: 'TorqueGirl Torque–Power Explorer', description, url, type: 'website' },
  twitter: { card: 'summary', title: 'TorqueGirl Torque–Power Explorer', description },
};
export default function ExplorerPage() {
  return <main className="tp-page"><SiteHeader active="Tools" />
    <section className="tp-hero"><p className="eyebrow">TorqueGirl / Engineering tools</p><h1>Torque. Power.<br /><em>Connected by RPM.</em></h1><p>Torque describes a turning effort. Power describes how quickly that effort transfers energy. Explore the relationship, one point or one curve at a time.</p><p className="tp-local">LOCAL CALCULATIONS · No upload, analytics or saved inputs on this page. Reloading or leaving clears your work.</p></section>
    <Explorer />
    <section className="tp-context"><h2>Why the peaks can differ</h2><p>Power equals torque multiplied by angular speed. As RPM rises, power can keep rising even after torque starts falling. Peak torque RPM can therefore differ from peak power RPM; the supplied samples determine what this explorer reports.</p><h2>The units matter</h2><p>P(W) = torque(Nm) × RPM × 2π / 60. One mechanical hp is approximately 745.699872 W; metric PS is a different unit and is not supported. Nm/lb-ft and kW/hp conversions preserve the quantity. Display values are rounded; calculations use the SI relationship.</p><p>The familiar 5252 RPM numerical equality applies only to lb-ft and mechanical hp. Separate plot scales here show no physical crossover. Unit conversion does not equate wheel, flywheel, net or gross ratings.</p><h2>Samples, not a performance prediction</h2><p>Peaks come only from supplied points. Lines between markers are visual guides, not measured or predicted values between samples. A synthetic or arbitrary curve describes no actual engine capability. This tool provides no tuning advice, diagnosis or real-engine guarantees.</p></section>
    <SiteFooter />
  </main>;
}
