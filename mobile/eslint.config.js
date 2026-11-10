// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    files: ["scripts/**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        __dirname: "readonly",
        __filename: "readonly",
        Buffer: "readonly",
      },
    },
  },
  // R3F has its own typed JSX host properties; these are not DOM elements.
  {
    files: ["src/scene/RoomScene.tsx", "src/scene/Viewport.tsx"],
    rules: { "react/no-unknown-property": "off" },
  },
  // Metro requires literal require() calls to discover bundled binary assets.
  {
    files: ["src/catalogue/bundled.ts", "src/scene/materials.ts"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    ignores: ["dist/**", "dist-ios/**", ".tools/**"],
  },
]);
