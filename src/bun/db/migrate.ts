import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import type { DB } from "./connection";

export function runMigrations(db: DB): void {
	migrate(db, { migrationsFolder: `${import.meta.dir}/../../../drizzle/migrations` });
}
