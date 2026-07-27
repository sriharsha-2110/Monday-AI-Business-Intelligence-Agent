import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  // Ensure that client-side routing works for static exports
  trailingSlash: true,
};

export default nextConfig;
