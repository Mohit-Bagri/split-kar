/**
 * @file next.config.ts
 * @description Next.js configuration
 * @author SplitKar Team
 * @created 2026-02-24
 */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  env: {
    // Ensure these are only available server-side
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
};

export default nextConfig;
