import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.spec.ts"],
    exclude: ["node_modules", ".agent", ".agents", "backups"],
    env: {
      DATABASE_URL: "file:./test.db",
      NODE_ENV: "test",
    },
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    fileParallelism: false,
  },
});
