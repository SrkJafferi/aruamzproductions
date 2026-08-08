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
      /* A full copy of the project, dependencies and all. The ignores above are
         root-relative, so without this every file under it — including its
         node_modules — gets linted and buries the app's own output. */
      "backup/**",
    ],
  },
];

export default eslintConfig;
