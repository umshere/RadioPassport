import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import { defineConfig } from "vite";
import { vercelPreset } from "@vercel/remix/vite";
import path from "path";

installGlobals();

export default defineConfig({
  plugins: [
    remix({
      presets: [vercelPreset()],
      // Future flags for React Router v7 compatibility
      future: {
        v3_fetcherPersist: true,
        v3_lazyRouteDiscovery: true,
        v3_relativeSplatPath: true,
        v3_singleFetch: true,
        v3_throwAbortReason: true,
      },
    }),
  ],
  resolve: {
    alias: [
      { find: "~/server", replacement: path.resolve(__dirname, "server") },
      { find: "~", replacement: path.resolve(__dirname, "app") },
      { find: "three/webgpu", replacement: "three" },
      { find: "three/tsl", replacement: "three" },
    ],
    dedupe: ["react", "react-dom"],
  },
  build: {
    target: "esnext",
  },
});
