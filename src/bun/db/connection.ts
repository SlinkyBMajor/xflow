import { Database } from "bun:sqlite";
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

export type DB = BunSQLiteDatabase<typeof schema>;

const connections = new Map<string, { db: DB; sqlite: Database }>();

export function getConnection(projectPath: string): DB {
	const existing = connections.get(projectPath);
	if (existing) return existing.db;

	const dbPath = `${projectPath}/.xflow/db.sqlite`;
	const sqlite = new Database(dbPath);

	sqlite.exec("PRAGMA journal_mode = WAL;");

	const db = drizzle(sqlite, { schema });
	connections.set(projectPath, { db, sqlite });
	return db;
}

export function enableForeignKeys(projectPath: string): void {
	const existing = connections.get(projectPath);
	if (existing) {
		existing.sqlite.exec("PRAGMA foreign_keys = ON;");
	}
}

export function closeConnection(projectPath: string): void {
	const existing = connections.get(projectPath);
	if (existing) {
		existing.sqlite.close();
		connections.delete(projectPath);
	}
}
