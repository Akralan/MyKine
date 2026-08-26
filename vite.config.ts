import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig } from "vite";

export default defineConfig({
  // HTTPS auto-signé : la caméra exige un contexte sécurisé, et on veut tester
  // sur téléphone via le réseau local (grand-angle). Accepter l'avertissement du navigateur.
  plugins: [basicSsl()],
  server: {
    host: true,
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
