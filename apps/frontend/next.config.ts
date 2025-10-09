import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["db"],
  
  serverExternalPackages: ["@prisma/client", "prisma"],
  
  output: "standalone",
};

export default nextConfig;
