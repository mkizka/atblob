import { mkizka } from "@mkizka/eslint-config";

export default [
  ...mkizka,
  {
    files: ["src/logger.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    ignores: ["vitest.config.ts"],
  },
];
