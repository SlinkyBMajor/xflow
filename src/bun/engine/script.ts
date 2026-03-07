import type { DB } from "../db/connection";
import type { Ticket, RunEvent } from "../../shared/types";
import type { WorkflowContext } from "./interpolate";
import { interpolate } from "./interpolate";
import * as runQueries from "../db/queries/runs";

interface CustomScriptParams {
	runId: string;
	nodeId: string;
	script: string;
	interpreter?: "bun" | "sh";
	timeoutMs?: number;
	ticket: Ticket;
	context: WorkflowContext;
	db: DB;
	projectPath?: string;
	onEvent?: (event: RunEvent) => void;
}

const activeProcesses = new Map<string, { kill: () => void }>();

export function killScriptProcess(runId: string): void {
	const proc = activeProcesses.get(runId);
	if (proc) {
		proc.kill();
		activeProcesses.delete(runId);
	}
}

function insertAndEmit(
	db: DB,
	runId: string,
	type: string,
	payload: unknown,
	onEvent?: (event: RunEvent) => void,
): void {
	const event: RunEvent = {
		id: crypto.randomUUID(),
		runId,
		type,
		payload,
		timestamp: new Date().toISOString(),
	};
	runQueries.insertRunEvent(db, event);
	onEvent?.(event);
}

export async function executeCustomScript(params: CustomScriptParams): Promise<string> {
	const {
		runId,
		nodeId,
		script,
		interpreter = "bun",
		timeoutMs = 30_000,
		context,
		db,
		projectPath,
		onEvent,
	} = params;

	const cwd = projectPath ?? process.cwd();
	const resolvedScript = interpolate(script, context);

	insertAndEmit(db, runId, "SCRIPT_STARTED", { nodeId, interpreter }, onEvent);

	const cmd: string[] =
		interpreter === "bun"
			? ["bun", "-e", resolvedScript]
			: ["sh", "-c", resolvedScript];

	const proc = Bun.spawn(cmd, {
		cwd,
		stdout: "pipe",
		stderr: "pipe",
	});

	activeProcesses.set(runId, proc);

	let stdout = "";
	let stderr = "";
	let timedOut = false;

	const timeout = setTimeout(() => {
		timedOut = true;
		proc.kill();
	}, timeoutMs);

	try {
		const stdoutReader = proc.stdout.getReader();
		const stderrReader = proc.stderr.getReader();
		const decoder = new TextDecoder();

		const readStream = async (
			reader: ReadableStreamDefaultReader<Uint8Array>,
			eventType: string,
		): Promise<string> => {
			let result = "";
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				const chunk = decoder.decode(value, { stream: true });
				result += chunk;
				insertAndEmit(db, runId, eventType, { nodeId, chunk }, onEvent);
			}
			return result;
		};

		[stdout, stderr] = await Promise.all([
			readStream(stdoutReader, "SCRIPT_OUTPUT"),
			readStream(stderrReader, "SCRIPT_STDERR"),
		]);

		await proc.exited;
	} finally {
		clearTimeout(timeout);
		activeProcesses.delete(runId);
	}

	if (timedOut) {
		insertAndEmit(db, runId, "SCRIPT_TIMEOUT", { nodeId, timeoutMs }, onEvent);
		throw new Error(`Custom script timed out after ${timeoutMs}ms`);
	}

	if (proc.exitCode !== 0) {
		insertAndEmit(db, runId, "SCRIPT_ERROR", { nodeId, exitCode: proc.exitCode, stderr }, onEvent);
		throw new Error(`Script exited with code ${proc.exitCode}: ${stderr}`);
	}

	insertAndEmit(db, runId, "SCRIPT_COMPLETED", { nodeId, outputLength: stdout.length }, onEvent);
	return stdout.trim();
}
