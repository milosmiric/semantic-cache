import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    "lib/index": "src/lib/index.ts",
    "cli/index": "src/cli/index.ts",
  },
  format: "esm",
  dts: true,
  clean: true,
  outDir: "dist",
  outputExtension: () => ({ js: ".js", dts: ".d.ts" }),
  external: [
    "mongodb",
    "voyageai",
    "ai",
    "@ai-sdk/openai",
    "zod",
    "chalk",
    "commander",
  ],
});
