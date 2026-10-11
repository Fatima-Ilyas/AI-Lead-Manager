import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: "react",
                test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              },
              {
                name: "charts",
                test: /node_modules[\\/](recharts|recharts-scale|d3-[^\\/]+|victory-vendor)[\\/]/,
              },
              {
                name: "components",
                test: /node_modules[\\/](@base-ui|@floating-ui)[\\/]/,
              },
            ],
          },
        },
      },
    },
    server: {
      host: "127.0.0.1",
      port: 5174,
      strictPort: true,
      proxy: {
        "/api": {
          target: env.API_PROXY_TARGET || "http://127.0.0.1:8000",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
