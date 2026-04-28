import path from "path"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  // Monorepo : remonter à la racine pour que le tracing inclut node_modules racine
  outputFileTracingRoot: path.join(__dirname, "../../"),
  experimental: {
    serverActions: {
      allowedOrigins: [],
    },
  },
}

export default nextConfig
