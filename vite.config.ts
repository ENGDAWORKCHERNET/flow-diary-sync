import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import groqScheduleHandler from "./api/groq-schedule";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  process.env.GROQ_API_KEY ??= env.GROQ_API_KEY;

  return ({
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
    mode === "development" && {
      name: "local-groq-schedule-proxy",
      configureServer(server) {
        server.middlewares.use("/api/groq-schedule", async (req, res, next) => {
          if (req.method !== "POST") {
            const proxyResponse = createProxyResponse(res);
            await groqScheduleHandler({ method: req.method } as never, proxyResponse as never);
            return;
          }

          try {
            const chunks: Buffer[] = [];
            let size = 0;
            for await (const chunk of req) {
              const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
              size += buffer.length;
              if (size > 4_200_000) {
                res.statusCode = 413;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "Schedule image is too large" }));
                return;
              }
              chunks.push(buffer);
            }

            let body: unknown;
            try {
              body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            } catch {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Invalid request body" }));
              return;
            }

            await groqScheduleHandler(
              { method: req.method, body } as never,
              createProxyResponse(res) as never,
            );
          } catch (error) {
            next(error);
          }
        });
      },
    },
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
  });
});

function createProxyResponse(res: import("node:http").ServerResponse) {
  return {
    status(code: number) {
      res.statusCode = code;
      return this;
    },
    json(body: unknown) {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(body));
      return this;
    },
  };
}
