import { mkizka } from "@mkizka/eslint-config";

export default [
  ...mkizka,
  {
    files: ["src/bin.ts"],
    rules: {
      "no-console": "off",
    },
  },
];
