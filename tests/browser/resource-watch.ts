import type { Page, Request } from '@playwright/test';

// A full-document exit can cancel the outgoing page's lazy images/telemetry.
// Retain those events as evidence, but distinguish them from failed resources
// on a document the test is using. All HTTP failures and console errors remain.
export function watch(page: Page, origin: string) {
  const errors: string[] = [], httpFailures: string[] = [];
  const starts = new WeakMap<Request, string>();
  const exits: { from: string; to: string; at: number }[] = [];
  const failures: { url: string; document: string; reason: string; at: number }[] = [];
  let document = page.url();
  page.on('request', request => {
    starts.set(request, page.url());
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      exits.push({ from: page.url(), to: request.url(), at: Date.now() });
    }
  });
  page.on('framenavigated', frame => {
    if (frame !== page.mainFrame()) return;
    exits.push({ from: document, to: frame.url(), at: Date.now() });
    document = frame.url();
  });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => {
    if (new URL(response.url()).origin === origin && response.status() >= 400) httpFailures.push(`${response.status()} ${response.url()}`);
  });
  page.on('requestfailed', request => {
    if (new URL(request.url()).origin === origin) failures.push({ url: request.url(), document: starts.get(request) ?? '', reason: request.failure()?.errorText ?? '', at: Date.now() });
  });
  return {
    errors,
    get resources() {
      const cancelled = failures.filter(failure => ['NS_BINDING_ABORTED', 'Load request cancelled'].includes(failure.reason) && exits.some(exit => exit.from === failure.document && exit.from !== exit.to && Math.abs(exit.at - failure.at) < 1000));
      if (cancelled.length) console.log(JSON.stringify({ expectedNavigationCancellations: cancelled }));
      return [...httpFailures, ...failures.filter(failure => !cancelled.includes(failure)).map(failure => `${failure.reason} ${failure.url}`)];
    },
  };
}
