/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Lot photos are captured on-device and stored as blobs/Supabase URLs.
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
  // The service worker in /public/sw.js must never be cached by the CDN,
  // or collectors get stranded on a stale offline bundle after a deploy.
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
