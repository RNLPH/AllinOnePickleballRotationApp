import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      registerType: "autoUpdate",

      manifest: {
        name: "KNGS Stack",
        short_name: "KNGS Stack",

        description:
          "Kuehne+Nagel racket sports court session manager",

        theme_color: "#003369",
        background_color: "#f8fafc",

        display: "standalone",

        icons: [
          {
            src: "pwa-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "logo.png",
            sizes: "900x900",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});