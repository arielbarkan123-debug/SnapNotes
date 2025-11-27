/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization for external sources
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
        pathname: '/storage/v1/object/**',
      },
    ],
    // Optimize images for performance
    formats: ['image/avif', 'image/webp'],
    // Reasonable size limits
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Enable strict mode for React
  reactStrictMode: true,
  // Improve production performance
  poweredByHeader: false,
};

export default nextConfig;
