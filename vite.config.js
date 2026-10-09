import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Two pages: the shop (index.html) and the admin dashboard (admin.html).
// base "/" because the site is served from the root of otishub.online;
// pages like /p/<id>/ and /c/<slug>/ need absolute asset paths.
export default defineConfig({
  base: "/",
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
