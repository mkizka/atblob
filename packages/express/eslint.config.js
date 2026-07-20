import { mkizka } from "@mkizka/eslint-config";

export default [
  ...mkizka,
  {
    ignores: ["vitest.config.ts"],
  },
];
