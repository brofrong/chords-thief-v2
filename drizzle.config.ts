import { defineConfig } from "drizzle-kit";
import { env } from "./src/utils/env";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: env.DB_FILE_NAME!,
  },
});
