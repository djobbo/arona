import { defineConfig } from "vite"

export default defineConfig({
  // optimizeDeps: {
  //   include: ["react", "react-reconciler"],
  //   force: true,
  // },
  resolve: {
    alias: {
      "@": "./src",
    },
  },
})
