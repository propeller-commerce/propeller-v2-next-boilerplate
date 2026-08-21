import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Underscore-prefixed names are the conventional "declared on purpose,
    // deliberately unused" marker (a required positional parameter, a
    // destructured field kept for documentation). The boilerplate already used
    // that convention in several places while the rule still flagged them.
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // The CMS providers decode JSON authored in Strapi / Prepr / Contentful.
    // Those payloads are the vendors' shapes, not ours; they change with the
    // content model and are validated by the normalizers themselves, which is
    // exactly what these files are. Spelling them out would be inventing types
    // for someone else's API and pretending they are guaranteed.
    //
    // Scoped deliberately: `any` stays an error everywhere else in the
    // boilerplate, so a fresh scaffold lints clean without the rule being
    // switched off wholesale.
    files: ["lib/cms/normalizers.ts", "lib/cms/strapi.ts", "lib/cms/providers/*.ts"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
]);

export default eslintConfig;
