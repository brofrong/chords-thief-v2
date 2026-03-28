import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { env } from "../utils/env";
import {relations} from './schema';

export const db = drizzle(env.DB_FILE_NAME, { relations });
try {
  migrate(db, { migrationsFolder: './src/db/drizzle' });
  console.log('Migration completed');
} catch (error) {
  console.error('Error during migration:', error);
  process.exit(1);
}
