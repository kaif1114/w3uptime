import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["db"],
  experimental: {
    // Ensure Prisma binaries and the shared package are handled correctly on the server
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
};

export default nextConfig;
