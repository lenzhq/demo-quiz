import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const djangoTarget = `http://localhost:${process.env.DJANGO_PORT || "8000"}`;

export default defineConfig({
  plugins: [tailwindcss(), react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
        },
      },
    },
  },
  server: {
    proxy: {
      "/api/": {
        target: djangoTarget,
        changeOrigin: true,
      },
    },
  },
});
