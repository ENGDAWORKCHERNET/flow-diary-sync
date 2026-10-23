import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.ico",
        "favicon.png",
        "apple-touch-icon.png",
        "icon-192.png",
        "icon-512.png",
        "screenshot-wide.png",
        "screenshot-narrow.png",
      ],
      // Tell the browser the SW controls all navigations
      injectRegister: "auto",
      workbox: {
        // Precache the app shell
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        // Never cache GA collection requests
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/sw\.js/],
        runtimeCaching: [
          {
            // Cache images with a cache-first strategy
            urlPattern: /\.(?:png|ico|svg|jpg|jpeg|webp|gif)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            // Network-first for navigation (fresh HTML always tried first)
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages",
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
      manifest: {
        id: "/",
        name: "StudyFlow",
        short_name: "StudyFlow",
        description: "Smart student productivity dashboard for managing classes, tasks, and deadlines.",
        theme_color: "#0f172a",
        background_color: "#020617",
        display: "standalone",
        display_override: ["standalone", "minimal-ui", "browser"],
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        lang: "en",
        categories: ["education", "productivity"],
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        screenshots: [
          {
            src: "/screenshot-wide.png",
            sizes: "1280x720",
            type: "image/png",
            // @ts-ignore – form_factor is valid in the spec but not yet in the type def
            form_factor: "wide",
            label: "StudyFlow Dashboard",
          },
          {
            src: "/screenshot-narrow.png",
            sizes: "720x1280",
            type: "image/png",
            // @ts-ignore
            form_factor: "narrow",
            label: "StudyFlow on Mobile",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Target modern browsers — smaller output, faster parse on mobile
    target: "es2015",
    rollupOptions: {
      output: {
        // Split stable vendor code into separate chunks so the browser
        // can cache them independently across deployments
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-toast",
            "@radix-ui/react-select",
            "@radix-ui/react-label",
          ],
          "vendor-ui": ["lucide-react", "next-themes", "sonner", "class-variance-authority", "clsx", "tailwind-merge"],
        },
      },
    },
  },
}));

