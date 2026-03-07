import { eq } from "drizzle-orm";
import type { DB } from "../connection";
import { workflows, lanes } from "../schema";
import type { Workflow, WorkflowIR } from "../../../shared/types";
import { snapshotVersion } from "./workflow-versions";

function rowToWorkflow(row: typeof workflows.$inferSelect): Workflow {
	return {
		...row,
		definition: JSON.parse(row.definition) as WorkflowIR,
	};
}

export function listWorkflows(db: DB): Workflow[] {
	const rows = db.select().from(workflows).all();
	return rows.map(rowToWorkflow);
}

export function getWorkflowById(db: DB, id: string): Workflow | null {
	const row = db.select().from(workflows).where(eq(workflows.id, id)).get();
	return row ? rowToWorkflow(row) : null;
}

export function createWorkflow(
	db: DB,
	id: string,
	name: string,
	definition: WorkflowIR,
): Workflow {
	const now = new Date().toISOString();
	const row = {
		id,
		name,
		definition: JSON.stringify(definition),
		createdAt: now,
		updatedAt: now,
	};
	db.insert(workflows).values(row).run();
	return rowToWorkflow(row);
}

export function updateWorkflow(
	db: DB,
	id: string,
	updates: { name?: string; definition?: WorkflowIR },
): Workflow {
	if (updates.definition !== undefined) {
		const current = getWorkflowById(db, id);
		if (current) {
			snapshotVersion(db, id, current.definition);
		}
	}

	const setValues: Record<string, unknown> = {
		updatedAt: new Date().toISOString(),
	};
	if (updates.name !== undefined) setValues.name = updates.name;
	if (updates.definition !== undefined)
		setValues.definition = JSON.stringify(updates.definition);

	db.update(workflows).set(setValues).where(eq(workflows.id, id)).run();
	return getWorkflowById(db, id)!;
}

export function deleteWorkflow(db: DB, id: string): void {
	db.update(lanes)
		.set({ workflowId: null })
		.where(eq(lanes.workflowId, id))
		.run();
	db.delete(workflows).where(eq(workflows.id, id)).run();
}
