/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Phase 2: Body size limit for Supabase Storage uploads via Server Actions
  // Set to 100mb (higher than 50MB limit) to allow buffer and better error handling
  // Actual limit enforced by Supabase Storage free tier: 50MB
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
    // CRITICAL: Also set middleware body size to prevent truncation at 10MB default
    middlewareClientMaxBodySize: '100mb',
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

export default nextConfig
