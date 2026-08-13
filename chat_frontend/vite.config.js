import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const useHttps = env.VITE_DEV_HTTPS === "true";

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      port: 5174,
      strictPort: true,
      ...(useHttps
        ? {
            https: {
              key: fs.readFileSync("./192.168.9.38+2-key.pem"),
              cert: fs.readFileSync("./192.168.9.38+2.pem"),
            },
          }
        : {}),
    },
  };
});
