import { defineConfig } from "vite";
import { VitePluginNode } from "vite-plugin-node";

export default defineConfig({
  ssr: {
    // Remove express from noExternal to allow it to remain external
    noExternal: [],
    // Explicitly mark express and other CommonJS modules as external
    external: ["express"],
  },
  optimizeDeps: {
    // Include express in optimization for development
    include: ["express"],
    exclude: ["fsevents"],
  },
  plugins: [
    ...VitePluginNode({
      adapter: "express",
      appPath: "./src/index.ts",
      exportName: "viteNodeApp",
      tsCompiler: "esbuild",
    }),
  ],
  build: {
    // Ensure CommonJS compatibility in build
    rollupOptions: {
      external: ["express"],
    },
  },
});
