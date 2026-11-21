import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  devIndicators: false,
  outputFileTracingRoot: __dirname,
  images: {
    localPatterns: [{ pathname: "/images/**" }],
  },
};

export default nextConfig;
