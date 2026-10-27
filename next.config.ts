import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Evita que o Next procure package-lock.json em pastas acima do projeto.
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
