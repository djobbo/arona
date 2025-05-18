import { defineConfig } from "vite"
import { resolve } from "path"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx"],
  },
  // Ensure we're setting up properly for Node.js
  ssr: {
    // External packages that shouldn't be bundled
    noExternal: [],
  },
  optimizeDeps: {
    // Disable dependency optimization for Node environment
    disabled: true,
  },
})
