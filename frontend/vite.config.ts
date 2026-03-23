import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  resolve: {
    alias: {
      "@": "/src",
      "fhenixjs-dist": fileURLToPath(
        new URL("./node_modules/fhenixjs/dist/fhenix.esm.js", import.meta.url),
      ),
    },
  },
});
