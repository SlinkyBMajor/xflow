import { eq } from "drizzle-orm";
import type { DB } from "../connection";
import { boards } from "../schema";
import type { Board } from "../../../shared/types";

export function getBoard(db: DB, boardId: string): Board | undefined {
	const row = db.select().from(boards).where(eq(boards.id, boardId)).get();
	return row ?? undefined;
}

export function getFirstBoard(db: DB): Board | undefined {
	const row = db.select().from(boards).limit(1).get();
	return row ?? undefined;
}

export function createBoard(db: DB, id: string, name: string): Board {
	const now = new Date().toISOString();
	const row = { id, name, createdAt: now };
	db.insert(boards).values(row).run();
	return row;
}

export function updateBoard(db: DB, boardId: string, name: string): Board {
	db.update(boards).set({ name }).where(eq(boards.id, boardId)).run();
	return getBoard(db, boardId)!;
}
