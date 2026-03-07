import { mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { DB } from "../db/connection";
import type { BoardTemplate, WorkflowIR } from "../../shared/types";
import * as laneQueries from "../db/queries/lanes";
import * as boardQueries from "../db/queries/boards";
import * as workflowQueries from "../db/queries/workflows";
import * as ticketQueries from "../db/queries/tickets";
import { BUILTIN_TEMPLATES } from "./builtin-templates";

function getTemplateDir(): string {
	const dir = join(homedir(), ".config", "xflow", "templates");
	mkdirSync(dir, { recursive: true });
	return dir;
}

export function listTemplates(): BoardTemplate[] {
	const dir = getTemplateDir();
	const userTemplates: BoardTemplate[] = [];

	try {
		const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
		for (const file of files) {
			try {
				const content = readFileSync(join(dir, file), "utf-8");
				userTemplates.push(JSON.parse(content));
			} catch {
				// Skip invalid files
			}
		}
	} catch {
		// Directory may not exist yet
	}

	return [...BUILTIN_TEMPLATES, ...userTemplates];
}

export function exportBoardAsTemplate(
	db: DB,
	name: string,
	description?: string,
): BoardTemplate {
	const board = boardQueries.getFirstBoard(db);
	if (!board) throw new Error("No board found");

	const lanes = laneQueries.getLanesByBoard(db, board.id);

	const templateLanes = lanes.map((lane) => {
		let workflow: WorkflowIR | undefined;
		if (lane.workflowId) {
			const wf = workflowQueries.getWorkflowById(db, lane.workflowId);
			if (wf) workflow = wf.definition;
		}
		return {
			name: lane.name,
			color: lane.color,
			order: lane.order,
			workflow,
		};
	});

	const template: BoardTemplate = {
		id: crypto.randomUUID(),
		name,
		description,
		version: 1,
		lanes: templateLanes,
		createdAt: new Date().toISOString(),
	};

	const dir = getTemplateDir();
	writeFileSync(join(dir, `${template.id}.json`), JSON.stringify(template, null, 2));

	return template;
}

export function applyTemplate(db: DB, boardId: string, template: BoardTemplate): void {
	const board = boardQueries.getFirstBoard(db);
	if (!board) throw new Error("No board found");

	const existingTickets = ticketQueries.getTicketsByBoard(db, board.id);
	if (existingTickets.length > 0) {
		throw new Error("Cannot apply template to a board with existing tickets");
	}

	// Delete existing lanes
	const existingLanes = laneQueries.getLanesByBoard(db, board.id);
	for (const lane of existingLanes) {
		if (lane.workflowId) {
			laneQueries.attachWorkflow(db, lane.id, null);
		}
		laneQueries.deleteLane(db, lane.id);
	}

	// Build name → id map for moveToLane remapping
	const laneNameToId = new Map<string, string>();

	// Create lanes first (so we have IDs for remapping)
	const laneRecords: { id: string; name: string; templateLane: (typeof template.lanes)[0] }[] = [];
	for (const tLane of template.lanes) {
		const laneId = crypto.randomUUID();
		laneNameToId.set(tLane.name, laneId);
		laneRecords.push({ id: laneId, name: tLane.name, templateLane: tLane });
		laneQueries.createLane(db, laneId, board.id, tLane.name, tLane.color);
	}

	// Create workflows and attach to lanes
	for (const rec of laneRecords) {
		if (!rec.templateLane.workflow) continue;

		const workflowId = crypto.randomUUID();
		const remappedIR = remapMoveToLaneNodes(rec.templateLane.workflow, laneNameToId);
		workflowQueries.createWorkflow(db, workflowId, `${rec.name} Workflow`, remappedIR);
		laneQueries.attachWorkflow(db, rec.id, workflowId);
	}
}

function remapMoveToLaneNodes(ir: WorkflowIR, laneNameToId: Map<string, string>): WorkflowIR {
	return {
		...ir,
		nodes: ir.nodes.map((node) => {
			if (node.type === "moveToLane" && node.config.type === "moveToLane") {
				const newLaneId = laneNameToId.get(node.config.laneName) ?? "";
				return {
					...node,
					config: { ...node.config, laneId: newLaneId },
				};
			}
			return node;
		}),
	};
}

export function deleteTemplate(id: string): void {
	if (id.startsWith("builtin-")) {
		throw new Error("Cannot delete built-in templates");
	}
	const dir = getTemplateDir();
	const filePath = join(dir, `${id}.json`);
	if (existsSync(filePath)) {
		unlinkSync(filePath);
	}
}
