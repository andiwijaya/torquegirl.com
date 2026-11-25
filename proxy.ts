import { NextResponse, type NextRequest } from 'next/server';
import { siteOrigin } from './lib/site-seo';

export function proxy(request: NextRequest) {
  const destination = new URL(siteOrigin);
  destination.pathname = request.nextUrl.pathname;
  destination.search = request.nextUrl.search;
  return NextResponse.redirect(destination, 308);
}

export const config = {
  matcher: [{
    source: '/:path*',
    has: [
      { type: 'host', value: 'torquegirl\\.com' },
      // Cloudflare sets this header to the protocol used by the visitor.
      { type: 'header', key: 'x-forwarded-proto', value: 'http' },
    ],
  }],
};
