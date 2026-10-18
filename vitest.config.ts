import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Never let a developer's shell key turn mocked tests into live Jev calls.
    env: { TYPESAFE_API_KEY: "" },
    include: ["tests/unit/**/*.test.ts"],
  },
  resolve: {
    alias: [
      { find: "~/server", replacement: path.resolve(__dirname, "server") },
      { find: "~", replacement: path.resolve(__dirname, "app") },
    ],
  },
});
