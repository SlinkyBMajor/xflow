import { buildNodeRegistryPrompt } from "../../shared/node-registry";
import type { WorkflowIR } from "../../shared/types";
import { validateIR } from "../../shared/validate-ir";

interface GenerateWorkflowParams {
	prompt: string;
	existingIR?: WorkflowIR;
	mode: "replace" | "add";
	onEvent?: (event: { type: "text" | "tool_use" | "tool_result" | "status"; content: string }) => void;
}

const SYSTEM_PROMPT = `You are a workflow designer for XFlow, a Kanban-based workflow automation tool.

Your job is to generate a WorkflowIR JSON object from a natural language description.

## WorkflowIR Type Definition

\`\`\`typescript
interface WorkflowIR {
  version: 1;
  nodes: IRNode[];
  edges: IREdge[];
}

interface IRNode {
  id: string;          // use placeholder IDs like "node-1", "node-2", etc.
  type: IRNodeType;    // one of the types listed below
  position: { x: number; y: number };  // use {x: 0, y: 0} — will be auto-laid-out
  label?: string;      // optional custom label
  config: IRNodeConfig;
}

interface IREdge {
  id: string;          // use placeholder IDs like "edge-1", "edge-2", etc.
  from: string;        // source node ID
  to: string;          // target node ID
  on?: string;         // event name for conditional edges (e.g. "TRUE", "FALSE", "APPROVED", "REJECTED")
}
\`\`\`

## Config Types

- start: \`{ type: "start" }\`
- end: \`{ type: "end" }\`
- claudeAgent: \`{ type: "claudeAgent", prompt: string, timeoutMs?: number, includeWorkflowOutput?: boolean, worktreeEnabled?: boolean, outputLabel?: string }\`
- customScript: \`{ type: "customScript", script: string, interpreter?: "bun" | "sh", timeoutMs?: number }\`
- notify: \`{ type: "notify", title: string, body: string }\`
- waitForApproval: \`{ type: "waitForApproval", message: string }\`
- moveToLane: \`{ type: "moveToLane", laneId: "", laneName: "" }\`
- condition: \`{ type: "condition", expression: string }\`
- setMetadata: \`{ type: "setMetadata", key: string, value: string }\`
- log: \`{ type: "log", message: string }\`

## Rules

1. Every workflow MUST have exactly one "start" node and at least one "end" node.
2. Use placeholder IDs like "node-1", "node-2" for nodes and "edge-1", "edge-2" for edges.
3. Set all positions to {x: 0, y: 0} — they will be auto-laid-out.
4. For condition nodes, use "on": "TRUE" and "on": "FALSE" on outgoing edges.
5. For waitForApproval nodes, use "on": "APPROVED" and "on": "REJECTED" on outgoing edges.
6. Write helpful, specific prompts for Claude Agent nodes based on the user's description.
7. NEVER ask clarifying questions. NEVER output explanations, markdown, or commentary. If the request is ambiguous, make reasonable assumptions and generate a valid workflow.
8. Your entire response MUST be a single valid JSON object and nothing else.
`;

function buildFullPrompt(params: GenerateWorkflowParams): string {
	const parts: string[] = [];

	parts.push(buildNodeRegistryPrompt());

	if (params.existingIR) {
		parts.push("\n## Existing Workflow\n");
		parts.push("```json\n" + JSON.stringify(params.existingIR, null, 2) + "\n```\n");
		if (params.mode === "add") {
			parts.push("Add to (do not replace) this existing workflow. Return the COMPLETE workflow (existing + new nodes/edges merged).\n");
		} else {
			parts.push("Modify this existing workflow based on the user's request. Return the COMPLETE updated workflow.\n");
		}
	}

	parts.push("\n## User Request\n");
	parts.push(params.prompt);
	parts.push("\n\nRespond with ONLY the WorkflowIR JSON object. No explanation, no markdown fences.");

	return parts.join("\n");
}

function replaceIdsWithUUIDs(ir: WorkflowIR): WorkflowIR {
	const idMap = new Map<string, string>();

	const getOrCreate = (placeholder: string): string => {
		if (!idMap.has(placeholder)) {
			idMap.set(placeholder, crypto.randomUUID());
		}
		return idMap.get(placeholder)!;
	};

	return {
		version: 1,
		nodes: ir.nodes.map((n) => ({
			...n,
			id: getOrCreate(n.id),
		})),
		edges: ir.edges.map((e) => ({
			...e,
			id: getOrCreate(e.id),
			from: getOrCreate(e.from),
			to: getOrCreate(e.to),
		})),
	};
}

function extractJSON(text: string): string {
	const jsonMatch = text.match(/\{[\s\S]*\}/);
	if (jsonMatch) return jsonMatch[0];
	return text;
}

export async function generateWorkflowIR(params: GenerateWorkflowParams): Promise<WorkflowIR> {
	const { onEvent } = params;
	const userPrompt = buildFullPrompt(params);

	onEvent?.({ type: "status", content: "Starting Claude CLI..." });

	const cliArgs = [
		"claude",
		"-p",
		userPrompt,
		"--output-format",
		"stream-json",
		"--verbose",
		"--model",
		"haiku",
		"--system-prompt",
		SYSTEM_PROMPT,
		"--max-turns",
		"1",
	];

	const proc = Bun.spawn(cliArgs, {
		stdout: "pipe",
		stderr: "pipe",
		env: { ...process.env },
	});

	let outputText = "";
	let stderrText = "";

	// Read stderr in background
	const stderrPromise = (async () => {
		const reader = proc.stderr.getReader();
		const decoder = new TextDecoder();
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			stderrText += decoder.decode(value, { stream: true });
		}
	})();

	// Stream stdout line by line
	const reader = proc.stdout.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;

		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split("\n");
		buffer = lines.pop() ?? "";

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed) continue;

			try {
				const event = JSON.parse(trimmed);

				// Assistant text chunks
				if (event.type === "assistant" && event.message?.content) {
					for (const block of event.message.content) {
						if (block.type === "text") {
							outputText += block.text;
							onEvent?.({ type: "text", content: block.text });
						}
					}
				}

				// Tool use
				if (event.type === "assistant" && event.message?.content) {
					for (const block of event.message.content) {
						if (block.type === "tool_use") {
							onEvent?.({ type: "tool_use", content: `${block.name}(${JSON.stringify(block.input).slice(0, 200)})` });
						}
					}
				}

				// Tool result
				if (event.type === "content_block_start" && event.content_block?.type === "tool_result") {
					onEvent?.({ type: "tool_result", content: String(event.content_block.text ?? "").slice(0, 200) });
				}

				// Final result — replaces accumulated text
				if (event.type === "result" && typeof event.result === "string" && event.result.trim()) {
					outputText = event.result;
					onEvent?.({ type: "status", content: "Received final result" });
				}
			} catch {
				// Non-JSON line, ignore
			}
		}
	}

	// Process remaining buffer
	if (buffer.trim()) {
		try {
			const event = JSON.parse(buffer.trim());
			if (event.type === "result" && typeof event.result === "string" && event.result.trim()) {
				outputText = event.result;
			}
		} catch {
			// ignore
		}
	}

	await proc.exited;
	await stderrPromise;

	if (proc.exitCode !== 0 && !outputText) {
		const errorDetail = stderrText.trim() || `Process exited with code ${proc.exitCode}`;
		throw new Error(`Claude CLI failed: ${errorDetail}`);
	}

	if (!outputText.trim()) {
		throw new Error("Claude returned empty output");
	}

	onEvent?.({ type: "status", content: "Parsing workflow..." });

	// Extract JSON from the output
	const jsonText = extractJSON(outputText);

	let parsed: WorkflowIR;
	try {
		parsed = JSON.parse(jsonText);
	} catch (err) {
		throw new Error(`Failed to parse AI response as JSON: ${(err as Error).message}\n\nResponse: ${outputText.slice(0, 500)}`);
	}

	// Replace placeholder IDs with real UUIDs
	const ir = replaceIdsWithUUIDs(parsed);

	// Validate
	const validation = validateIR(ir);
	if (!validation.valid) {
		throw new Error(`Generated workflow is invalid: ${validation.errors.join(". ")}`);
	}

	return ir;
}
