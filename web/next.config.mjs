/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["posthog-js"]
  }
};

export default nextConfig;
