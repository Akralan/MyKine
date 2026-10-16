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
      // Trois pages : la démo patient à la racine, la landing sous /landing/, l'espace kiné sous /kine/.
      input: {
        app: fileURLToPath(new URL("./index.html", import.meta.url)),
        landing: fileURLToPath(new URL("./landing/index.html", import.meta.url)),
        kine: fileURLToPath(new URL("./kine/index.html", import.meta.url)),
      },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
