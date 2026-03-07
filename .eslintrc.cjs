module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ["@typescript-eslint", "react-hooks"],
  extends: ["eslint:recommended"],
  ignorePatterns: ["build/", "public/", "node_modules/"],
  rules: {
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "no-undef": "off",
    "no-control-regex": "off",
    "no-redeclare": "off",
    "no-unused-vars": "off",
    "no-useless-escape": "off",
  },
};
