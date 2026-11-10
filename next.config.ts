import type { NextConfig } from "next";

// cacheComponents off: every page is a live read of local state, nothing is cacheable.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
