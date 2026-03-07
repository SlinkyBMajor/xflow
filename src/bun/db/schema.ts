import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const boards = sqliteTable("boards", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	createdAt: text("created_at").notNull(),
});

export const lanes = sqliteTable("lanes", {
	id: text("id").primaryKey(),
	boardId: text("board_id")
		.notNull()
		.references(() => boards.id),
	name: text("name").notNull(),
	order: integer("order").notNull(),
	color: text("color"),
	wipLimit: integer("wip_limit"),
	workflowId: text("workflow_id").references(() => workflows.id),
});

export const workflows = sqliteTable("workflows", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	definition: text("definition").notNull(),
	createdAt: text("created_at").notNull(),
	updatedAt: text("updated_at").notNull(),
});

export const tickets = sqliteTable("tickets", {
	id: text("id").primaryKey(),
	boardId: text("board_id")
		.notNull()
		.references(() => boards.id),
	laneId: text("lane_id")
		.notNull()
		.references(() => lanes.id),
	title: text("title").notNull(),
	body: text("body"),
	tags: text("tags"),
	metadata: text("metadata"),
	order: integer("order").notNull().default(0),
	createdAt: text("created_at").notNull(),
	updatedAt: text("updated_at").notNull(),
});

export const workflowVersions = sqliteTable("workflow_versions", {
	id: text("id").primaryKey(),
	workflowId: text("workflow_id")
		.notNull()
		.references(() => workflows.id, { onDelete: "cascade" }),
	version: integer("version").notNull(),
	definition: text("definition").notNull(),
	createdAt: text("created_at").notNull(),
	label: text("label"),
});

export const workflowRuns = sqliteTable("workflow_runs", {
	id: text("id").primaryKey(),
	ticketId: text("ticket_id")
		.notNull()
		.references(() => tickets.id),
	workflowId: text("workflow_id")
		.notNull()
		.references(() => workflows.id),
	actorSnapshot: text("actor_snapshot"),
	currentNodeId: text("current_node_id"),
	nodeStatus: text("node_status").notNull(),
	status: text("status").notNull(),
	startedAt: text("started_at").notNull(),
	finishedAt: text("finished_at"),
	lastCheckpoint: text("last_checkpoint_at"),
});

export const runEvents = sqliteTable("run_events", {
	id: text("id").primaryKey(),
	runId: text("run_id")
		.notNull()
		.references(() => workflowRuns.id),
	type: text("type").notNull(),
	payload: text("payload"),
	timestamp: text("timestamp").notNull(),
});
