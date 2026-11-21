import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // These aliases yield automatically to the new filesystem routes on integration.
    return { beforeFiles: [], afterFiles: [], fallback: [
      { source: "/reportes", destination: "/informe" },
      { source: "/subir", destination: "/informe/tamizaje-rosa/subir" },
    ] };
  },
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
