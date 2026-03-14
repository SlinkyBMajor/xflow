import { z } from "zod";
import type { WorkflowIR } from "./types";

// ── Enum schemas ──

const IRNodeTypeSchema = z.enum([
	"start",
	"end",
	"claudeAgent",
	"customScript",
	"notify",
	"waitForApproval",
	"moveToLane",
	"condition",
	"setMetadata",
	"log",
	"gitAction",
]);

const ClaudeModelSchema = z.enum(["sonnet", "opus", "haiku"]);

const AllowedToolsPresetSchema = z.enum(["plan-only", "read-only", "edit", "full", "custom"]);

const GitActionTypeSchema = z.enum(["createPr", "addReviewer", "mergePr"]);

const MergeMethodSchema = z.enum(["squash", "merge", "rebase"]);

// ── Per-node-type config schemas ──

const StartConfigSchema = z.looseObject({ type: z.literal("start") });

const EndConfigSchema = z.looseObject({ type: z.literal("end") });

const ClaudeAgentConfigSchema = z.looseObject({
	type: z.literal("claudeAgent"),
	prompt: z.string(),
	timeoutMs: z.number().optional(),
	includeWorkflowOutput: z.boolean().optional(),
	worktreeEnabled: z.boolean().optional(),
	outputLabel: z.string().optional(),
	model: ClaudeModelSchema.optional(),
	maxTurns: z.number().optional(),
	systemPrompt: z.string().optional(),
	skipPermissions: z.boolean().optional(),
	allowedToolsPreset: AllowedToolsPresetSchema.optional(),
	allowedToolsCustom: z.string().optional(),
});

const CustomScriptConfigSchema = z.looseObject({
	type: z.literal("customScript"),
	script: z.string(),
	interpreter: z.enum(["bun", "sh"]).optional(),
	timeoutMs: z.number().optional(),
});

const NotifyConfigSchema = z.looseObject({
	type: z.literal("notify"),
	title: z.string(),
	body: z.string(),
});

const WaitForApprovalConfigSchema = z.looseObject({
	type: z.literal("waitForApproval"),
	message: z.string(),
});

const MoveToLaneConfigSchema = z.looseObject({
	type: z.literal("moveToLane"),
	laneId: z.string(),
	laneName: z.string(),
});

const ConditionConfigSchema = z.looseObject({
	type: z.literal("condition"),
	expression: z.string(),
});

const SetMetadataConfigSchema = z.looseObject({
	type: z.literal("setMetadata"),
	key: z.string(),
	value: z.string(),
});

const LogConfigSchema = z.looseObject({
	type: z.literal("log"),
	message: z.string(),
});

const GitActionConfigSchema = z.looseObject({
	type: z.literal("gitAction"),
	action: GitActionTypeSchema,
	baseBranch: z.string().optional(),
	prTitle: z.string().optional(),
	prBody: z.string().optional(),
	reviewer: z.string().optional(),
	prNumber: z.string().optional(),
	mergeMethod: MergeMethodSchema.optional(),
});

// ── Discriminated union for all node configs ──

const IRNodeConfigSchema = z.discriminatedUnion("type", [
	StartConfigSchema,
	EndConfigSchema,
	ClaudeAgentConfigSchema,
	CustomScriptConfigSchema,
	NotifyConfigSchema,
	WaitForApprovalConfigSchema,
	MoveToLaneConfigSchema,
	ConditionConfigSchema,
	SetMetadataConfigSchema,
	LogConfigSchema,
	GitActionConfigSchema,
]);

// ── Structural schemas ──

const PositionSchema = z.object({ x: z.number(), y: z.number() });

const IRNodeSchema = z.object({
	id: z.string(),
	type: IRNodeTypeSchema,
	position: PositionSchema,
	label: z.string().optional(),
	config: IRNodeConfigSchema,
});

const IREdgeSchema = z.object({
	id: z.string(),
	from: z.string(),
	to: z.string(),
	on: z.string().optional(),
});

const WorkflowIRSchema = z.object({
	version: z.literal(1),
	nodes: z.array(IRNodeSchema),
	edges: z.array(IREdgeSchema),
});

// ── Helpers ──

function formatZodPath(path: (string | number)[]): string {
	return path.reduce<string>((acc, seg) => {
		if (typeof seg === "number") return `${acc}[${seg}]`;
		return acc ? `${acc}.${seg}` : seg;
	}, "");
}

function formatZodErrors(error: z.ZodError): string[] {
	return error.issues.map((issue) => {
		const path = formatZodPath(issue.path);
		return path ? `${path}: ${issue.message}` : issue.message;
	});
}

// ── Public API ──

export function parseAndValidateIR(raw: unknown): { valid: boolean; errors: string[]; ir?: WorkflowIR } {
	const result = WorkflowIRSchema.safeParse(raw);

	if (!result.success) {
		return { valid: false, errors: formatZodErrors(result.error) };
	}

	// Structure is valid — run graph-level checks
	const ir = result.data as WorkflowIR;
	const graphResult = validateIR(ir);
	if (!graphResult.valid) {
		return { valid: false, errors: graphResult.errors };
	}

	return { valid: true, errors: [], ir };
}

export function validateIR(ir: WorkflowIR): { valid: boolean; errors: string[] } {
	const errors: string[] = [];
	const startNodes = ir.nodes.filter((n) => n.type === "start");
	const endNodes = ir.nodes.filter((n) => n.type === "end");

	if (startNodes.length !== 1) errors.push("Workflow must have exactly one Entry node");
	if (endNodes.length === 0) errors.push("Workflow must have at least one End node");

	const nodeIds = new Set(ir.nodes.map((n) => n.id));
	for (const edge of ir.edges) {
		if (!nodeIds.has(edge.from)) errors.push(`Edge "${edge.id}" references unknown source node "${edge.from}"`);
		if (!nodeIds.has(edge.to)) errors.push(`Edge "${edge.id}" references unknown target node "${edge.to}"`);
	}

	return { valid: errors.length === 0, errors };
}
