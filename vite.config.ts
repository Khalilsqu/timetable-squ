// C:\Users\kalho\Desktop\github\squ_frontend2\vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
  base: "/timetable-squ/",
});
