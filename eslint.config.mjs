import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";
const compat = new FlatCompat({ baseDirectory: path.dirname(fileURLToPath(import.meta.url)) });
const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "types/database.ts",
      "next-env.d.ts"
    ]
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  { rules: { "react/no-unescaped-entities": "off" } },
  { files: ["tests/**/*.cjs"], rules: { "@typescript-eslint/no-require-imports": "off" } }
];

export default config;
