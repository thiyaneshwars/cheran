import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "**.trycloudflare.com",
    "10.231.170.164",
    "10.231.170.171",
    "10.112.84.171",
    "localhost",
    "127.0.0.1",
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  outputFileTracingIncludes: {
    "/*": ["./prisma/*.db"],
    "/api/*": ["./prisma/*.db"],
  },
  experimental: {
    agentUpgrade: "security",
    serverActions: {
      allowedOrigins: ["*.trycloudflare.com", "**.trycloudflare.com"],
    },
  },
};

export default nextConfig;
