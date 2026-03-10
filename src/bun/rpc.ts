import { BrowserView, Utils } from "electrobun/bun";
import type { XFlowRPC, WorkflowRunState } from "../shared/types";
import { openProject, getBoardData } from "./project/open";
import { getRecents, removeRecent } from "./project/recents";
import { getConnection } from "./db/connection";
import * as boardQueries from "./db/queries/boards";
import * as laneQueries from "./db/queries/lanes";
import * as ticketQueries from "./db/queries/tickets";
import * as workflowQueries from "./db/queries/workflows";
import * as versionQueries from "./db/queries/workflow-versions";
import * as runQueries from "./db/queries/runs";
import * as commentQueries from "./db/queries/comments";
import { lanes } from "./db/schema";
import { eq } from "drizzle-orm";
import { triggerWorkflowIfAttached } from "./engine/trigger";
import * as templates from "./project/templates";
import { getInterruptedRuns } from "./engine/recovery";
import { resumeRun, abortRun, sendEventToRun } from "./engine/runner";
import { getAgentApiPort } from "./server/agent-api";
import { removeWorktree } from "./git/worktree";
import { mergeWorktreeBranch, getWorktreeDiff } from "./git/merge";
import { getChangeSummary } from "./git/status";
import { startPrPoller, stopPrPoller } from "./git/pr-poller";

// Track which project path is associated with the current RPC context
// Since Electrobun's defineRPC is global, views send their project path
let activeProjectPath: string | null = null;

// Reference to the BrowserWindow for sending messages back to the browser.
// Set via setMainWindow() after the BrowserWindow is created.
let mainWindow: any = null;

export function setMainWindow(win: any) {
	mainWindow = win;
}

function getDb() {
	if (!activeProjectPath) throw new Error("No project open");
	return getConnection(activeProjectPath);
}

function getBoard() {
	return getBoardData(activeProjectPath!);
}

export const rpc = BrowserView.defineRPC<XFlowRPC>({
	handlers: {
		requests: {
			openProject: ({ path }) => {
				console.log("[RPC] openProject called with path:", path);
				try {
					stopPrPoller();
					const notifyBoardChanged = () => {
						mainWindow?.webview.rpc.send.boardUpdated(getBoard());
					};
					const result = openProject(path, (run) => {
						mainWindow?.webview.rpc.send.workflowRunUpdated(run);
					}, (event) => {
						mainWindow?.webview.rpc.send.runEventAdded(event);
					}, notifyBoardChanged);
					activeProjectPath = path;
					console.log("[RPC] openProject success:", result.project);
					if (result.interruptedRuns.length > 0) {
						mainWindow?.webview.rpc.send.interruptedRunsDetected(result.interruptedRuns);
					}
					startPrPoller({
						projectPath: path,
						getDb: () => getConnection(path),
						notify: {
							worktreeMergeResult: (data) => mainWindow?.webview.rpc.send.worktreeMergeResult(data),
							workflowRunUpdated: (run) => mainWindow?.webview.rpc.send.workflowRunUpdated(run),
						},
					});
					return result;
				} catch (err) {
					console.error("[RPC] openProject error:", err);
					throw err;
				}
			},

			getRecentProjects: () => {
				return getRecents();
			},

			removeRecentProject: ({ path }) => {
				removeRecent(path);
			},

			getBoard: () => {
				return getBoard();
			},

			updateBoard: ({ name }) => {
				const db = getDb();
				const board = boardQueries.getFirstBoard(db)!;
				return boardQueries.updateBoard(db, board.id, name);
			},

			createLane: ({ name, color }) => {
				const db = getDb();
				const board = boardQueries.getFirstBoard(db)!;
				const id = crypto.randomUUID();
				return laneQueries.createLane(db, id, board.id, name, color ?? null);
			},

			updateLane: ({ id, name, color, wipLimit, allowTicketCreation }) => {
				const db = getDb();
				return laneQueries.updateLane(db, id, { name, color, wipLimit, allowTicketCreation });
			},

			deleteLane: ({ id }) => {
				const db = getDb();
				laneQueries.deleteLane(db, id);
			},

			reorderLanes: ({ laneIds }) => {
				const db = getDb();
				laneQueries.reorderLanes(db, laneIds);
			},

			createTicket: ({ laneId, title, body, tags }) => {
				const db = getDb();
				const board = boardQueries.getFirstBoard(db)!;
				const id = crypto.randomUUID();
				return ticketQueries.createTicket(
					db,
					id,
					board.id,
					laneId,
					title,
					body ?? null,
					tags ?? [],
				);
			},

			updateTicket: ({ id, title, body, tags, metadata }) => {
				const db = getDb();
				return ticketQueries.updateTicket(db, id, { title, body, tags, metadata });
			},

			deleteTicket: ({ id }) => {
				const db = getDb();
				ticketQueries.deleteTicket(db, id);
			},

			resetTicket: ({ id }) => {
				const db = getDb();
				commentQueries.deleteCommentsByTicket(db, id);
				return ticketQueries.resetTicket(db, id)!;
			},

			moveTicket: ({ ticketId, targetLaneId, targetIndex }) => {
				const db = getDb();
				// Get source lane before the move
				const ticketBefore = ticketQueries.getTicket(db, ticketId);
				const sourceLaneId = ticketBefore?.laneId;

				ticketQueries.moveTicket(db, ticketId, targetLaneId, targetIndex);

				// Emit lane events if lane changed and there's an active run
				if (sourceLaneId && sourceLaneId !== targetLaneId) {
					const activeRun = runQueries.getActiveRunForTicket(db, ticketId);
					if (activeRun) {
						const sourceLane = db.select().from(lanes).where(eq(lanes.id, sourceLaneId)).get();
						const targetLane = db.select().from(lanes).where(eq(lanes.id, targetLaneId)).get();
						const now = new Date().toISOString();
						runQueries.insertRunEvent(db, {
							id: crypto.randomUUID(),
							runId: activeRun.id,
							type: "LANE_EXITED",
							payload: { laneId: sourceLaneId, laneName: sourceLane?.name ?? "", timestamp: now },
							timestamp: now,
						});
						runQueries.insertRunEvent(db, {
							id: crypto.randomUUID(),
							runId: activeRun.id,
							type: "LANE_ENTERED",
							payload: { laneId: targetLaneId, laneName: targetLane?.name ?? "", timestamp: now },
							timestamp: now,
						});
					}
				}

				triggerWorkflowIfAttached(db, ticketId, targetLaneId, (run) => {
					mainWindow?.webview.rpc.send.workflowRunUpdated(run);
				}, activeProjectPath ?? undefined, (event) => {
					mainWindow?.webview.rpc.send.runEventAdded(event);
				}, () => {
					mainWindow?.webview.rpc.send.boardUpdated(getBoard());
				}, getAgentApiPort());
			},

			reorderTicketsInLane: ({ laneId, ticketIds }) => {
				const db = getDb();
				ticketQueries.reorderTicketsInLane(db, laneId, ticketIds);
			},
			getWorkflow: ({ id }) => {
				const db = getDb();
				return workflowQueries.getWorkflowById(db, id);
			},

			listWorkflows: () => {
				const db = getDb();
				return workflowQueries.listWorkflows(db);
			},

			createWorkflow: ({ name }) => {
				const db = getDb();
				const id = crypto.randomUUID();
				const defaultIR = {
					version: 1 as const,
					nodes: [
						{ id: crypto.randomUUID(), type: "start" as const, position: { x: 250, y: 50 }, config: { type: "start" as const } },
						{ id: crypto.randomUUID(), type: "end" as const, position: { x: 250, y: 300 }, config: { type: "end" as const } },
					],
					edges: [],
				};
				return workflowQueries.createWorkflow(db, id, name, defaultIR);
			},

			updateWorkflow: ({ id, name, definition }) => {
				const db = getDb();
				return workflowQueries.updateWorkflow(db, id, { name, definition });
			},

			deleteWorkflow: ({ id }) => {
				const db = getDb();
				workflowQueries.deleteWorkflow(db, id);
			},

			listTemplates: () => {
				return templates.listTemplates();
			},

			exportBoardAsTemplate: ({ name, description }) => {
				const db = getDb();
				return templates.exportBoardAsTemplate(db, name, description);
			},

			applyTemplate: ({ templateId }) => {
				const db = getDb();
				const allTemplates = templates.listTemplates();
				const template = allTemplates.find((t) => t.id === templateId);
				if (!template) throw new Error(`Template ${templateId} not found`);
				const board = boardQueries.getFirstBoard(db);
				if (!board) throw new Error("No board found");
				templates.applyTemplate(db, board.id, template);
			},

			deleteTemplate: ({ id }) => {
				templates.deleteTemplate(id);
			},

			listWorkflowVersions: ({ workflowId }) => {
				const db = getDb();
				return versionQueries.listVersions(db, workflowId);
			},

			restoreWorkflowVersion: ({ workflowId, versionId }) => {
				const db = getDb();
				const version = versionQueries.getVersion(db, versionId);
				if (!version) throw new Error(`Version ${versionId} not found`);
				return workflowQueries.updateWorkflow(db, workflowId, { definition: version.definition });
			},

			attachWorkflowToLane: ({ laneId, workflowId }) => {
				const db = getDb();
				return laneQueries.attachWorkflow(db, laneId, workflowId);
			},

			getWorkflowRun: ({ id }) => {
				const db = getDb();
				return runQueries.getRunById(db, id);
			},

			getWorkflowRunsForTicket: ({ ticketId }) => {
				const db = getDb();
				return runQueries.getRunsByTicket(db, ticketId);
			},

			getRunEvents: ({ runId }) => {
				const db = getDb();
				return runQueries.getEventsByRun(db, runId);
			},

			getActiveRunForWorkflow: ({ workflowId }) => {
				const db = getDb();
				const run = runQueries.getActiveRunForWorkflow(db, workflowId);
				if (!run) return null;
				const events = runQueries.getEventsByRun(db, run.id);
				const completedNodeIds = events
					.filter((e) => e.type === "NODE_COMPLETED" && (e.payload as any)?.nodeId)
					.map((e) => (e.payload as any).nodeId as string);
				const errorEvent = events.find((e) => e.type === "SCRIPT_ERROR" || e.type === "AGENT_TIMEOUT" || e.type === "SCRIPT_TIMEOUT");
				const state: WorkflowRunState = {
					runId: run.id,
					status: run.status,
					currentNodeId: run.currentNodeId,
					completedNodeIds,
					errorNodeId: errorEvent ? (errorEvent.payload as any)?.nodeId ?? null : null,
				};
				return state;
			},

			getInterruptedRuns: () => {
				const db = getDb();
				return getInterruptedRuns(db);
			},

			retryRun: ({ runId }) => {
				const db = getDb();
				return resumeRun(db, runId, (run) => {
					mainWindow?.webview.rpc.send.workflowRunUpdated(run);
				}, activeProjectPath ?? undefined, (event) => {
					mainWindow?.webview.rpc.send.runEventAdded(event);
				}, () => {
					mainWindow?.webview.rpc.send.boardUpdated(getBoard());
				}, getAgentApiPort());
			},

			getTicketDerivedData: ({ ticketId }) => {
				const db = getDb();
				return ticketQueries.getTicketDerivedData(db, ticketId);
			},

			abortInterruptedRun: ({ runId }) => {
				const db = getDb();
				abortRun(db, runId, activeProjectPath ?? undefined);
			},

			getTicketComments: ({ ticketId }) => {
				const db = getDb();
				return commentQueries.getCommentsByTicket(db, ticketId);
			},

			addTicketComment: ({ ticketId, body, refNodeId, refLabel }) => {
				const db = getDb();
				const id = crypto.randomUUID();
				const comment = commentQueries.createComment(db, id, ticketId, body, refNodeId, refLabel);
				mainWindow?.webview.rpc.send.ticketCommentAdded(comment);
				return comment;
			},

			deleteTicketComment: ({ id }) => {
				const db = getDb();
				commentQueries.deleteComment(db, id);
			},

			approveRun: ({ runId, feedback }) => {
				if (feedback?.trim()) {
					const db = getDb();
					const run = runQueries.getRunById(db, runId);
					if (run) {
						const id = crypto.randomUUID();
						const comment = commentQueries.createComment(db, id, run.ticketId, feedback.trim(), undefined, "Approval");
						mainWindow?.webview.rpc.send.ticketCommentAdded(comment);
					}
				}
				sendEventToRun(runId, "APPROVED");
			},

			rejectRun: ({ runId, feedback }) => {
				if (feedback?.trim()) {
					const db = getDb();
					const run = runQueries.getRunById(db, runId);
					if (run) {
						const id = crypto.randomUUID();
						const comment = commentQueries.createComment(db, id, run.ticketId, feedback.trim(), undefined, "Rejection");
						mainWindow?.webview.rpc.send.ticketCommentAdded(comment);
					}
				}
				sendEventToRun(runId, "REJECTED");
			},

			mergeWorktreeBranch: ({ runId, strategy }) => {
				console.log(`[RPC] mergeWorktreeBranch called: runId=${runId}, strategy=${strategy}`);
				const db = getDb();
				const run = runQueries.getRunById(db, runId);
				if (!run) throw new Error(`Run ${runId} not found`);
				if (!run.worktreeBranch) throw new Error("Run has no worktree branch");
				if (!activeProjectPath) throw new Error("No project open");

				const projectPath = activeProjectPath;
				console.log(`[RPC] Run worktree: path=${run.worktreePath}, branch=${run.worktreeBranch}`);

				// Fetch ticket context for PR creation
				const ticket = ticketQueries.getTicket(db, run.ticketId);
				const prContext = ticket ? { ticketTitle: ticket.title, ticketBody: ticket.body } : undefined;

				// Run async — send result via message to avoid RPC timeout
				(async () => {
					try {
						const { getCurrentBranch } = await import("./git/worktree");
						const baseBranch = await getCurrentBranch(projectPath);
						const mergeStrategy = strategy ?? "auto";
						const result = await mergeWorktreeBranch(projectPath, run.worktreeBranch!, mergeStrategy, baseBranch, run.worktreePath ?? undefined, prContext);

						console.log(`[RPC] mergeWorktreeBranch result:`, JSON.stringify(result));

						runQueries.updateRun(db, runId, { mergeResult: result });

						if (result.success && mergeStrategy === "auto" && run.worktreePath) {
							await removeWorktree(projectPath, run.worktreePath);
							runQueries.updateRun(db, runId, { worktreePath: null });
						}

						mainWindow?.webview.rpc.send.worktreeMergeResult({ runId, result });
					} catch (err) {
						console.error(`[RPC] mergeWorktreeBranch error:`, err);
						mainWindow?.webview.rpc.send.worktreeMergeResult({
							runId,
							result: { success: false, strategy: strategy ?? "auto", conflicted: false, error: String(err) },
						});
					}
				})();
			},

			getWorktreeDiff: ({ runId }) => {
				const db = getDb();
				const run = runQueries.getRunById(db, runId);
				if (!run) throw new Error(`Run ${runId} not found`);
				if (!run.worktreePath) throw new Error("Run has no worktree");

				const worktreePath = run.worktreePath;
				// Run async — send result via message
				(async () => {
					try {
						const diff = await getWorktreeDiff(worktreePath);
						mainWindow?.webview.rpc.send.worktreeDiffResult({ runId, diff });
					} catch (err) {
						console.error(`[RPC] getWorktreeDiff error:`, err);
						mainWindow?.webview.rpc.send.worktreeDiffResult({ runId, diff: `Error: ${err}` });
					}
				})();
			},

			getWorktreeRuns: async () => {
				const db = getDb();
				const runs = runQueries.getRunsWithWorktrees(db);
				const results = await Promise.all(
					runs.map(async (run) => {
						let changeSummary = { added: 0, modified: 0, deleted: 0, total: 0 };
						if (run.worktreePath) {
							try {
								changeSummary = await Promise.race([
									getChangeSummary(run.worktreePath),
									new Promise<typeof changeSummary>((_, reject) =>
										setTimeout(() => reject(new Error("timeout")), 2000)
									),
								]);
							} catch {
								// timeout or error — use zeroed summary
							}
						}
						return { run, changeSummary };
					})
				);
				return results;
			},

			updateBoardSettings: ({ settings }) => {
				const db = getDb();
				const board = boardQueries.getFirstBoard(db)!;
				return boardQueries.updateBoardSettings(db, board.id, settings);
			},

			checkCliTool: async ({ tool }) => {
				const result = { tool, installed: false, version: null as string | null, authenticated: null as boolean | null, authDetails: null as string | null, error: null as string | null };
				try {
					const checks: Record<string, { versionCmd: string[]; authCmd?: string[]; parseAuth?: (out: string) => { ok: boolean; details: string } }> = {
						claude: {
							versionCmd: ["claude", "--version"],
							authCmd: ["claude", "--help"],
							parseAuth: () => ({ ok: true, details: "CLI available" }),
						},
						gh: {
							versionCmd: ["gh", "--version"],
							authCmd: ["gh", "auth", "status"],
							parseAuth: (out) => {
								const logged = out.includes("Logged in");
								return { ok: logged, details: logged ? out.split("\n").find(l => l.includes("Logged in"))?.trim() ?? "Authenticated" : "Not authenticated" };
							},
						},
						git: {
							versionCmd: ["git", "--version"],
						},
						bun: {
							versionCmd: ["bun", "--version"],
						},
					};

					const check = checks[tool];
					if (!check) {
						result.error = `Unknown tool: ${tool}`;
						return result;
					}

					// Check installation + version
					const versionProc = Bun.spawn(check.versionCmd, { stdout: "pipe", stderr: "pipe" });
					const versionOut = await new Response(versionProc.stdout).text();
					const versionErr = await new Response(versionProc.stderr).text();
					await versionProc.exited;

					if (versionProc.exitCode !== 0) {
						result.error = versionErr.trim() || "Command failed";
						return result;
					}

					result.installed = true;
					result.version = versionOut.trim().split("\n")[0];

					// Check auth if applicable
					if (check.authCmd && check.parseAuth) {
						try {
							const authProc = Bun.spawn(check.authCmd, { stdout: "pipe", stderr: "pipe" });
							const authOut = await new Response(authProc.stdout).text();
							const authErr = await new Response(authProc.stderr).text();
							await authProc.exited;
							const combined = authOut + authErr;
							const authResult = check.parseAuth(combined);
							result.authenticated = authResult.ok;
							result.authDetails = authResult.details;
						} catch {
							result.authenticated = false;
							result.authDetails = "Auth check failed";
						}
					}
				} catch (err) {
					result.error = `Not found: ${tool}`;
				}
				return result;
			},

			openInEditor: ({ content, label }) => {
				const sanitized = label.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60);
				const tmpPath = `/tmp/xflow-output-${sanitized}.txt`;
				Bun.write(tmpPath, content);
				Bun.spawn(["open", tmpPath]);
			},

			cleanupWorktree: ({ runId }) => {
				const db = getDb();
				const run = runQueries.getRunById(db, runId);
				if (!run) throw new Error(`Run ${runId} not found`);
				if (!run.worktreePath || !activeProjectPath) return;

				const projectPath = activeProjectPath;
				const worktreePath = run.worktreePath;
				(async () => {
					try {
						await removeWorktree(projectPath, worktreePath);
						runQueries.updateRun(db, runId, { worktreePath: null });
						mainWindow?.webview.rpc.send.worktreeCleanupDone({ runId });
					} catch (err) {
						console.error(`[RPC] cleanupWorktree error:`, err);
					}
				})();
			},
			markPrMerged: ({ runId }) => {
				const db = getDb();
				const run = runQueries.getRunById(db, runId);
				if (!run) throw new Error(`Run ${runId} not found`);
				if (!activeProjectPath) throw new Error("No project open");

				const projectPath = activeProjectPath;
				(async () => {
					try {
						if (run.worktreePath) {
							await removeWorktree(projectPath, run.worktreePath);
						}
						const updatedMergeResult = run.mergeResult
							? { ...run.mergeResult, prMerged: true }
							: null;
						runQueries.updateRun(db, runId, {
							worktreePath: null,
							mergeResult: updatedMergeResult,
						});
						const updatedRun = runQueries.getRunById(db, runId);
						if (updatedRun) {
							mainWindow?.webview.rpc.send.workflowRunUpdated(updatedRun);
						}
					} catch (err) {
						console.error(`[RPC] markPrMerged error:`, err);
					}
				})();
			},
		},
		messages: {
			toggleMaximize: () => {
				if (mainWindow?.isMaximized()) {
					mainWindow.unmaximize();
				} else {
					mainWindow?.maximize();
				}
			},
			openExternal: ({ url }) => {
				Utils.openExternal(url);
			},
			openProjectPicker: async () => {
				console.log("[RPC] openProjectPicker message received");
				try {
					const paths = await Utils.openFileDialog({
						canChooseFiles: false,
						canChooseDirectory: true,
						allowsMultipleSelection: false,
					});
					console.log("[RPC] openFileDialog returned:", paths);
					const path = paths && paths.length > 0 ? paths[0] : null;
					mainWindow?.webview.rpc.send.projectPickerResult({ path });
				} catch (err) {
					console.error("[RPC] openProjectPicker error:", err);
					mainWindow?.webview.rpc.send.projectPickerResult({ path: null });
				}
			},
		},
	},
});
