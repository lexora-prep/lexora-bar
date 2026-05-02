import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          destination: "/landing.html",
        },
      ],
    }
  },
  productionBrowserSourceMaps: false,
  /* config options here */
};

export default nextConfig;
