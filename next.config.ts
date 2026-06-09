import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

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
}

export default withSentryConfig(nextConfig, {
  silent: true,
})
