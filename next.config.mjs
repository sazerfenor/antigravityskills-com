import bundleAnalyzer from '@next/bundle-analyzer';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import { createMDX } from 'fumadocs-mdx/next';
import createNextIntlPlugin from 'next-intl/plugin';

const withMDX = createMDX();

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const withNextIntl = createNextIntlPlugin({
  requestConfig: './src/core/i18n/request.ts',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.VERCEL ? undefined : 'standalone',
  reactStrictMode: false,
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],

  // ⭐ Cloudflare Workers + Turso 关键配置
  serverExternalPackages: [
    '@libsql/client',
    '@libsql/isomorphic-ws',
    '@tursodatabase/serverless',
    'mysql2',
    '@planetscale/database',
  ],

  // Webpack configuration to handle postgres module for Cloudflare Workers
  webpack: (config, { isServer, nextRuntime }) => {
    // For Edge Runtime (Cloudflare Workers), replace postgres module with empty module
    if (isServer && nextRuntime === 'edge') {
      config.resolve.alias = {
        ...config.resolve.alias,
        postgres: false,
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
      },
    ],
    // 🚀 核心修复：开启下一代图片格式 (2MB PNG → 200KB AVIF)
    formats: ['image/avif', 'image/webp'],
    // 📐 设备断点：生成更贴合的缩略图
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 💾 缓存优化：30 天客户端缓存
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  turbopack: {
    resolveAlias: {
      // fs: {
      //   browser: './empty.ts', // We recommend to fix code imports before using this method
      // },
    },
  },
  experimental: {
    turbopackFileSystemCacheForDev: true,
    // React Compiler is DISABLED - causes __name is not defined error on Cloudflare
    reactCompiler: false,
    // Disable mdxRs for Vercel deployment compatibility with fumadocs-mdx
    ...(process.env.VERCEL ? {} : { mdxRs: true }),
    // 🚀 Bundle Optimization: Auto tree-shake heavy packages
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@radix-ui/react-icons',
      'framer-motion',
      '@emoji-mart/react',
      '@emoji-mart/data',
    ],
    // 🚀 Bundle Optimization: Tree-shake react-icons (reduces ~400KB)
    modularizeImports: {
      'react-icons/?(((\\w*)?/?)*)': {
        transform: 'react-icons/{{ matches.[1] }}/{{member}}',
      },
    },
  },
};

export default withBundleAnalyzer(withNextIntl(withMDX(nextConfig)));

initOpenNextCloudflareForDev();
