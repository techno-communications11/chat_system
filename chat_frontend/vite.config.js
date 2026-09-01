import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";

/* global process */

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const useHttps = env.VITE_DEV_HTTPS === "true";

  return {
    plugins: [react()],
    server: {
      host: env.VITE_DEV_HOST || "0.0.0.0",
      port: 5174,
      strictPort: true,
      // Google Identity Services monitors its OAuth popup through window.closed.
      // Keep the opener relationship available while the popup is active.
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      },
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
