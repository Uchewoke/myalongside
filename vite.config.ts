import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      host: true,
      port: Number(env.VITE_PORT || 5173),
    },
    preview: {
      host: true,
      port: Number(env.VITE_PREVIEW_PORT || 4173),
    },
    define: {
      __APP_NAME__: JSON.stringify(env.VITE_APP_NAME || "MyAlongSide"),
    },
  };
});
