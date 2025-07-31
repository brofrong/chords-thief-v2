import { antfu } from "@antfu/eslint-config";
import prettier from "eslint-plugin-prettier/recommended";

export default antfu(
  { stylistic: false, typescript: true, isInEditor: false },
  {
    files: ["**/*.ts", "**/*.tsx"],
    ...prettier,
  },
  {
    rules: {
      "jsonc/sort-keys": "off",
      "antfu/no-top-level-await": "off",
    },
  },
);
