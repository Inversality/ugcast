// ESLint v9 flat config. `eslint-config-next` (v16) ships a flat config array,
// so we spread it directly and add our ignore globs. Run with `npm run lint`.
import next from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "public/**",
      "remotion/out/**",
    ],
  },
  ...next,
];

export default config;
