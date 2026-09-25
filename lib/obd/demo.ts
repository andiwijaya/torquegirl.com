/** Illustrative synthetic data, never a real vehicle or diagnostic reference. */
export function demoCsv(rows = 1200): string {
  const lines = ['Time (s),Engine RPM (rpm),Vehicle speed (km/h),Throttle position (%),Coolant temperature (C),STFT Bank 1 (%),MAP (kPa),Battery voltage (V),Custom status'];
  for (let i = 0; i < rows; i++) {
    const t = i / 10 + (i >= rows / 2 ? 12 : 0), wave = Math.max(0, Math.sin(i / 100));
    lines.push(`${t.toFixed(1)},${Math.round(850 + wave * 3500)},${(wave * 95).toFixed(1)},${(12 + wave * 72).toFixed(1)},${i % 10 ? '' : (87 + i / rows * 5).toFixed(1)},${i % 3 ? '' : (Math.sin(i / 40) * 8).toFixed(1)},${(32 + wave * 61).toFixed(1)},13.9,${i % 2 ? 'RUN' : 'READY'}`);
  }
  return lines.join('\n');
}
