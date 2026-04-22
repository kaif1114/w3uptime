import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: require("path").resolve(__dirname, "../.."),
  transpilePackages: ["db"],
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
