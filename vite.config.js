import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Two pages: the shop (index.html) and the admin dashboard (admin.html).
// base "./" makes every asset path relative, so the build works on
// GitHub Pages (https://<user>.github.io/<repo>/) or any other static host.
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        admin: resolve(import.meta.dirname, "admin.html"),
      },
    },
  },
});
