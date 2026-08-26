import { defineConfig } from "vite";

export default defineConfig({
  server: {
    // La caméra exige un contexte sécurisé : localhost suffit, mais pour tester
    // sur téléphone via le réseau local il faut HTTPS (voir README).
    host: true,
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
