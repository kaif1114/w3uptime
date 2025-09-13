import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["db"],
  // Ensure Prisma binaries and the shared package are handled correctly on the server
  serverExternalPackages: ["@prisma/client", "prisma"],
  // Enable standalone output for Docker builds
  output: "standalone",
};

export default nextConfig;
