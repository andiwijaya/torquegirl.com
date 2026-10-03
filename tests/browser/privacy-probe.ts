// Request events can arrive after their initiating editorial document has left.
// Check browser API calls in the document that actually initiates them; tests
// also retain global URL/body sentinels and protected resource checks.
export const PRIVATE_INITIATORS_KEY = 'torquegirl-test-private-initiators';
export const BROWSER_CALL_RESOURCES = ['fetch', 'xhr', 'ping', 'other'];
export function installPrivateDocumentNetworkProbe() {
  const record = (method: string, url: string, body = false) => {
    if (!['/tools/obd2-log-analyzer', '/tools/torque-power-explorer'].some(path => location.pathname.startsWith(path))) return;
    if (new URL(url, location.href).origin === location.origin && ['GET', 'HEAD'].includes(method.toUpperCase()) && !body) return;
    const key = 'torquegirl-test-private-initiators';
    sessionStorage.setItem(key, JSON.stringify([...JSON.parse(sessionStorage.getItem(key) ?? '[]'), { method, url, document: location.pathname }]));
  };
  const fetch = window.fetch, beacon = navigator.sendBeacon, open = XMLHttpRequest.prototype.open, send = XMLHttpRequest.prototype.send;
  window.fetch = (...args) => { const [input, init] = args; record(init?.method ?? (input instanceof Request ? input.method : 'GET'), input instanceof Request ? input.url : String(input), !!init?.body || input instanceof Request && input.body !== null); return fetch(...args); };
  navigator.sendBeacon = (...args) => { record('POST', String(args[0]), true); return beacon.apply(navigator, args); };
  const xhr = new WeakMap<XMLHttpRequest, { method: string; url: string }>();
  Object.defineProperty(XMLHttpRequest.prototype, 'open', { value: function(this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) { xhr.set(this, { method, url: String(url) }); return Reflect.apply(open, this, [method, url, ...rest]); } });
  Object.defineProperty(XMLHttpRequest.prototype, 'send', { value: function(this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) { const request = xhr.get(this); if (request) record(request.method, request.url, !!body); return send.call(this, body); } });
}
