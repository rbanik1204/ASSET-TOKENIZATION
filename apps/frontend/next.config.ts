import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Intentionally minimal to keep compatibility across supported Next versions.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
