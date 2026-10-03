import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    // These public tool documents never contain user inputs. Prevent edge HTML
    // transforms from injecting telemetry into their browser-local workspaces.
    // https://developers.cloudflare.com/web-analytics/get-started/
    return ['/tools/obd2-log-analyzer', '/tools/torque-power-explorer'].flatMap(path => [path, `${path}/:path*`]).map(source => ({
      source,
      headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate, no-transform' }],
    }));
  },
};

export default nextConfig;
