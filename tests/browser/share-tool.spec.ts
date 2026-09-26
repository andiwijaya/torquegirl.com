import { test, expect } from '@playwright/test';

const expectedPayload = {
  title: 'TorqueGirl OBD2 Log Analyzer',
  text: 'Explore your OBD2 log locally in your browser. Nothing is uploaded.',
  url: 'https://torquegirl.com/tools/obd2-log-analyzer',
};

test('Share Tool sends only its static public payload after an analysis is loaded', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (payload: unknown) => { (window as unknown as { sharedPayload: unknown }).sharedPayload = payload; },
    });
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/tools/obd2-log-analyzer');
  const shareButton = page.getByRole('button', { name: 'Share TorqueGirl OBD2 Log Analyzer' });
  await expect(shareButton).toBeVisible();
  await page.getByLabel('Choose CSV log').setInputFiles({
    name: 'PRIVATE_VEHICLE_FILENAME.csv', mimeType: 'text/csv',
    buffer: Buffer.from('Time (s),SecretPID,PrivateMapping\n0,98765,HiddenTemplate\n1,12345,AnotherPrivateValue'),
  });
  await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What happened here?' })).toBeVisible();
  await shareButton.click();
  const payload = await page.evaluate(() => (window as unknown as { sharedPayload: unknown }).sharedPayload);
  expect(payload).toEqual(expectedPayload);
  expect(JSON.stringify(payload)).not.toMatch(/PRIVATE_VEHICLE_FILENAME|SecretPID|98765|PrivateMapping|HiddenTemplate|12345/);
  expect(new URL((payload as typeof expectedPayload).url).search).toBe('');
  await expect(page.locator('.obd-share-status')).toHaveText('Share options opened.');
});

test('Share Tool copies the canonical URL when Web Share is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => { (window as unknown as { copiedText: string }).copiedText = text; } },
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tools/obd2-log-analyzer');
  const shareButton = page.getByRole('button', { name: 'Share TorqueGirl OBD2 Log Analyzer' });
  await expect(shareButton).toBeVisible();
  await shareButton.click();
  await expect(page.locator('.obd-share-status')).toHaveText('Link copied.');
  expect(await page.evaluate(() => (window as unknown as { copiedText: string }).copiedText)).toBe(expectedPayload.url);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await shareButton.focus();
  await expect(shareButton).toBeFocused();
});

for (const width of [320, 1280]) {
  test(`Share Tool fits at ${width}px without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/tools/obd2-log-analyzer');
    const button = page.getByRole('button', { name: 'Share TorqueGirl OBD2 Log Analyzer' });
    await expect(button).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByText('Choose a CSV log')).toHaveCSS('background-color', 'rgb(220, 48, 59)');
    await page.getByRole('button', { name: 'Explore demo', exact: true }).click();
    await page.getByRole('button', { name: 'Analyze log', exact: true }).click();
    await expect(button).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
