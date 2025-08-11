import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["db"],
  // Ensure Prisma binaries and the shared package are handled correctly on the server
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
