import { eq, desc } from "drizzle-orm";
import type { DB } from "../connection";
import { workflowVersions } from "../schema";
import type { WorkflowVersion, WorkflowIR } from "../../../shared/types";

function rowToVersion(row: typeof workflowVersions.$inferSelect): WorkflowVersion {
	return {
		...row,
		definition: JSON.parse(row.definition) as WorkflowIR,
	};
}

export function listVersions(db: DB, workflowId: string): WorkflowVersion[] {
	return db
		.select()
		.from(workflowVersions)
		.where(eq(workflowVersions.workflowId, workflowId))
		.orderBy(desc(workflowVersions.version))
		.all()
		.map(rowToVersion);
}

export function getVersion(db: DB, id: string): WorkflowVersion | null {
	const row = db.select().from(workflowVersions).where(eq(workflowVersions.id, id)).get();
	return row ? rowToVersion(row) : null;
}

export function getNextVersionNumber(db: DB, workflowId: string): number {
	const latest = db
		.select()
		.from(workflowVersions)
		.where(eq(workflowVersions.workflowId, workflowId))
		.orderBy(desc(workflowVersions.version))
		.limit(1)
		.get();
	return latest ? latest.version + 1 : 1;
}

export function snapshotVersion(
	db: DB,
	workflowId: string,
	definition: WorkflowIR,
	label?: string,
): WorkflowVersion {
	const version = getNextVersionNumber(db, workflowId);
	const row = {
		id: crypto.randomUUID(),
		workflowId,
		version,
		definition: JSON.stringify(definition),
		createdAt: new Date().toISOString(),
		label: label ?? null,
	};
	db.insert(workflowVersions).values(row).run();
	return rowToVersion(row);
}
