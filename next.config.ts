import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Anexos e fotos enviados pelos formulários.
    serverActions: { bodySizeLimit: "20mb" },
  },
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
