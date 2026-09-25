/** Synthetic ground-truth drive. Never represented as a real-device export. */
export function driveCsv(options: { rows?: number; trim?: number; speedOffset?: number; rpmOffset?: number; start?: number; step?: number; mode?: 'cruise' | 'cycle' } = {}) {
  const { rows = 161, trim = 10.8, speedOffset = 0, rpmOffset = 0, start = 0, step = 0.5, mode = 'cycle' } = options;
  const lines = ['Time (s),Speed (km/h),RPM,Throttle (%),Engine load (%),Coolant (C),LTFT Bank 1 (%),MAF (g/s),MAP (kPa)'];
  for (let i = 0; i < rows; i++) {
    const t = i * step;
    let speed = 60, rpm = 2400;
    if (mode === 'cycle') {
      if (t < 10) { speed = 0; rpm = 0; }
      else if (t < 20) { speed = 0; rpm = 800; }
      else if (t < 35) { speed = (t - 20) * 4; rpm = 800 + speed * 27; }
      else if (t < 55) { speed = 60; rpm = 2420; }
      else if (t < 70) { speed = Math.max(0, 60 - (t - 55) * 4); rpm = 800 + speed * 27; }
      else { speed = 0; rpm = 800; }
    }
    rpm += rpmOffset; speed += speedOffset;
    const wave = mode === 'cruise' ? Math.sin(t / 20) * 50 : 0;
    rpm += wave;
    lines.push([start + t, speed.toFixed(3), rpm.toFixed(3), 30, 40, 90, trim, (rpm * 0.005 + 2).toFixed(5), 50].join(','));
  }
  return lines.join('\n');
}
