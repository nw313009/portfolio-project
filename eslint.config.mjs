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
      // Standalone throwaway fixture with its own tsconfig-less pipeline;
      // exercised at runtime by content-validation.integration.test.ts, not
      // part of the app's typechecked/linted source.
      "test/fixtures/**",
    ],
  },
];

export default eslintConfig;
