module.exports = {
  extends: ["standard-with-typescript"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig-eslint.json",
    tsconfigRootDir: __dirname,
    sourceType: "module",
    warnOnUnsupportedTypeScriptVersion: false,
  },
  plugins: [
    "redos",
    "simple-import-sort"
  ],
  rules: {
    // note you must disable the base rule as it can report incorrect errors
    "no-use-before-define": "off",
    "@typescript-eslint/no-use-before-define": ["error"],
    "@typescript-eslint/triple-slash-reference": "off",
    "simple-import-sort/imports": "error",
  },
  env: {
    mocha: true
  }
};
