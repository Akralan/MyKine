import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // HTTPS auto-signé : la caméra exige un contexte sécurisé, et on veut tester
  // sur téléphone via le réseau local (grand-angle). Accepter l'avertissement du navigateur.
  plugins: [basicSsl()],
  server: {
    host: true,
  },
  build: {
    rollupOptions: {
      // Deux pages : la démo à la racine, la landing sous /landing/.
      input: {
        app: fileURLToPath(new URL("./index.html", import.meta.url)),
        landing: fileURLToPath(new URL("./landing/index.html", import.meta.url)),
      },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
