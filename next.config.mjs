/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security headers for production
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

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
      // Unsplash images for web-searched course images
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      // Unsplash photos CDN
      {
        protocol: 'https',
        hostname: '*.unsplash.com',
      },
      // Lorem Picsum for course cover images
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      // Fastly CDN for Picsum
      {
        protocol: 'https',
        hostname: '*.picsum.photos',
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

  // Bundle optimization
  experimental: {
    // Optimize package imports - only import what's used
    optimizePackageImports: ['@supabase/supabase-js', 'swr'],
  },

  // Webpack optimizations
  webpack: (config, { isServer }) => {
    // Don't bundle server-only packages on client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
        stream: false,
        buffer: false,
      };
    }
    return config;
  },
};

export default nextConfig;
