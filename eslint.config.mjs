import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      /* Headless-Chrome QA probes. They drive a browser over CDP, so most of
         their body is evaluated-in-page source held in template literals —
         the app's rules read that as dead expressions and flag it. */
      ".qa/**",
    ],
  },
];

export default eslintConfig;
