import { eq } from "drizzle-orm";
import type { DB } from "../connection";
import { boards } from "../schema";
import type { Board, BoardSettings } from "../../../shared/types";

function rowToBoard(row: typeof boards.$inferSelect): Board {
	return {
		...row,
		settings: row.settings ? JSON.parse(row.settings) : null,
	};
}

export function getBoard(db: DB, boardId: string): Board | undefined {
	const row = db.select().from(boards).where(eq(boards.id, boardId)).get();
	return row ? rowToBoard(row) : undefined;
}

export function getFirstBoard(db: DB): Board | undefined {
	const row = db.select().from(boards).limit(1).get();
	return row ? rowToBoard(row) : undefined;
}

export function createBoard(db: DB, id: string, name: string): Board {
	const now = new Date().toISOString();
	const row = { id, name, createdAt: now, settings: null };
	db.insert(boards).values(row).run();
	return rowToBoard(row);
}

export function updateBoard(db: DB, boardId: string, name: string): Board {
	db.update(boards).set({ name }).where(eq(boards.id, boardId)).run();
	return getBoard(db, boardId)!;
}

export function updateBoardSettings(db: DB, boardId: string, settings: BoardSettings): Board {
	db.update(boards).set({ settings: JSON.stringify(settings) }).where(eq(boards.id, boardId)).run();
	return getBoard(db, boardId)!;
}
