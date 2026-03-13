import { useState, useCallback, useEffect, useRef } from "react";
import {
	ReactFlow,
	Background,
	Controls,
	MiniMap,
	useNodesState,
	useEdgesState,
	addEdge,
	type Connection,
	type Node,
	type Edge,
	ReactFlowProvider,
	useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./workflow-theme.css";
import type { WorkflowIR, Lane, NodeRunStatus } from "../../../shared/types";
import { useWorkflow } from "../../hooks/useWorkflow";
import { rpc } from "../../rpc";
import { useWorkflowRunState } from "../../hooks/useWorkflowRunState";
import { irToReactFlow, reactFlowToIR, validateIR, getDefaultConfig, getNodeLabel } from "../../lib/workflow-ir";
import { applyDagreLayout } from "../../lib/dagre-layout";
import { nodeTypes } from "./nodes";
import { NodePalette } from "./NodePalette";
import { NodeConfigPanel } from "./NodeConfigPanel";
import { VersionHistory } from "./VersionHistory";
import { NodeReferenceModal } from "./NodeReferenceModal";
import { WorkflowAIAssistant } from "./WorkflowAIAssistant";
import { WorkflowToolbox, type WorkflowToolboxState, type EdgeStyle } from "./WorkflowToolbox";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface WorkflowEditorProps {
	workflowId: string;
	lanes: Lane[];
	onBack?: () => void;
	onNameChange?: (id: string, name: string) => void;
}

function WorkflowEditorInner({ workflowId, lanes, onNameChange }: WorkflowEditorProps) {
	const { getWorkflow, updateWorkflow } = useWorkflow();
	const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
	const [selectedNode, setSelectedNode] = useState<Node | null>(null);
	const [isDirty, setIsDirty] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [loaded, setLoaded] = useState(false);
	const [workflowName, setWorkflowName] = useState("");
	const [savedName, setSavedName] = useState("");
	const [editingName, setEditingName] = useState(false);
	const [showHistory, setShowHistory] = useState(false);
	const [showNodeReference, setShowNodeReference] = useState(false);
	const [showAIAssistant, setShowAIAssistant] = useState(false);
	const [toolbox, setToolbox] = useState<WorkflowToolboxState>({
		edgeType: "smoothstep",
		snapToGrid: false,
		snapGrid: 20,
		showMinimap: true,
		panOnScroll: false,
	});
	const reactFlowWrapper = useRef<HTMLDivElement>(null);
	const { screenToFlowPosition, fitView } = useReactFlow();
	const { runState, isRunning, getNodeRunStatus } = useWorkflowRunState(workflowId);

	// Inject runStatus into node data when running
	useEffect(() => {
		if (!isRunning) return;
		setNodes((nds) =>
			nds.map((n) => ({
				...n,
				data: { ...n.data, runStatus: getNodeRunStatus(n.id) },
			})),
		);
	}, [runState, isRunning, getNodeRunStatus, setNodes]);

	// Clear runStatus when run ends
	useEffect(() => {
		if (isRunning) return;
		setNodes((nds) =>
			nds.map((n) => {
				if (n.data.runStatus) {
					const { runStatus, ...rest } = n.data;
					return { ...n, data: rest };
				}
				return n;
			}),
		);
	}, [isRunning, setNodes]);

	// Highlight edges during run
	useEffect(() => {
		if (!isRunning || !runState) return;
		setEdges((eds) =>
			eds.map((e) => {
				const sourceCompleted = runState.completedNodeIds.includes(e.source);
				const targetCompleted = runState.completedNodeIds.includes(e.target);
				const isActiveEdge = sourceCompleted && runState.currentNodeId === e.target;

				if (isActiveEdge) {
					return { ...e, animated: true, style: { stroke: "#58a6ff", strokeWidth: 2 } };
				}
				if (sourceCompleted && targetCompleted) {
					return { ...e, animated: false, style: { stroke: "#10b981", strokeWidth: 2 } };
				}
				return { ...e, animated: false, style: { stroke: "#52525b", strokeWidth: 2 } };
			}),
		);
	}, [runState, isRunning, setEdges]);

	// Load workflow
	useEffect(() => {
		(async () => {
			const workflow = await getWorkflow(workflowId);
			if (workflow) {
				const { nodes: rfNodes, edges: rfEdges } = irToReactFlow(workflow.definition);
				setNodes(rfNodes);
				setEdges(rfEdges);
				setWorkflowName(workflow.name);
				setSavedName(workflow.name);
			}
			setLoaded(true);
		})();
	}, [workflowId]);

	// Track dirty state
	const markDirty = useCallback(() => {
		setIsDirty(true);
		setSaveError(null);
	}, []);

	const handleNodesChange = useCallback((changes: any) => {
		onNodesChange(changes);
		if (loaded) markDirty();
	}, [onNodesChange, loaded, markDirty]);

	const handleEdgesChange = useCallback((changes: any) => {
		onEdgesChange(changes);
		if (loaded) markDirty();
	}, [onEdgesChange, loaded, markDirty]);

	// Edge connection
	const onConnect = useCallback((connection: Connection) => {
		const newEdge: Edge = {
			id: crypto.randomUUID(),
			source: connection.source,
			target: connection.target,
			sourceHandle: connection.sourceHandle,
			targetHandle: connection.targetHandle,
			type: toolbox.edgeType,
			style: { stroke: "#52525b" },
		};
		setEdges((eds) => addEdge(newEdge, eds));
		markDirty();
	}, [setEdges, markDirty, toolbox.edgeType]);

	// Edge validation
	const isValidConnection = useCallback((connection: Edge | Connection) => {
		if (connection.source === connection.target) return false;
		const targetNode = nodes.find((n) => n.id === connection.target);
		if (targetNode?.type === "start") return false;
		const sourceNode = nodes.find((n) => n.id === connection.source);
		if (sourceNode?.type === "end") return false;
		return true;
	}, [nodes]);

	// Node selection
	const onNodeClick = useCallback((_: any, node: Node) => {
		setSelectedNode(node);
	}, []);

	const onPaneClick = useCallback(() => {
		setSelectedNode(null);
	}, []);

	// Update node data from config panel
	const onUpdateNodeData = useCallback((nodeId: string, data: Record<string, unknown>) => {
		setNodes((nds) =>
			nds.map((n) => (n.id === nodeId ? { ...n, data } : n))
		);
		setSelectedNode((prev) => (prev?.id === nodeId ? { ...prev, data } : prev));
		markDirty();
	}, [setNodes, markDirty]);

	// Delete node
	const onDeleteNode = useCallback((nodeId: string) => {
		setNodes((nds) => nds.filter((n) => n.id !== nodeId));
		setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
		setSelectedNode(null);
		markDirty();
	}, [setNodes, setEdges, markDirty]);

	// Drop from palette
	const onDragOver = useCallback((event: React.DragEvent) => {
		event.preventDefault();
		event.dataTransfer.dropEffect = "move";
	}, []);

	const onDrop = useCallback((event: React.DragEvent) => {
		event.preventDefault();
		const nodeType = event.dataTransfer.getData("application/xflow-node-type");
		if (!nodeType) return;

		const position = screenToFlowPosition({
			x: event.clientX,
			y: event.clientY,
		});

		const newNode: Node = {
			id: crypto.randomUUID(),
			type: nodeType,
			position,
			data: {
				label: getNodeLabel(nodeType as any),
				config: getDefaultConfig(nodeType as any),
			},
		};

		setNodes((nds) => [...nds, newNode]);
		markDirty();
	}, [screenToFlowPosition, setNodes, markDirty]);

	// Save workflow name
	const handleNameSave = useCallback(async (newName: string) => {
		const trimmed = newName.trim();
		if (trimmed && trimmed !== savedName) {
			await updateWorkflow(workflowId, { name: trimmed });
			setWorkflowName(trimmed);
			setSavedName(trimmed);
			onNameChange?.(workflowId, trimmed);
		} else {
			setWorkflowName(savedName);
		}
		setEditingName(false);
	}, [savedName, workflowId, updateWorkflow, onNameChange]);

	// Save
	const handleSave = useCallback(async () => {
		const ir = reactFlowToIR(nodes, edges);
		const validation = validateIR(ir);
		if (!validation.valid) {
			setSaveError(validation.errors.join(". "));
			return;
		}
		await updateWorkflow(workflowId, { definition: ir });
		setIsDirty(false);
		setSaveError(null);
	}, [nodes, edges, workflowId, updateWorkflow]);

	// Restore version
	const handleRestoreVersion = useCallback(async (versionId: string) => {
		const workflow = await rpc.request.restoreWorkflowVersion({ workflowId, versionId });
		const { nodes: rfNodes, edges: rfEdges } = irToReactFlow(workflow.definition);
		setNodes(rfNodes);
		setEdges(rfEdges);
		setIsDirty(false);
		setSaveError(null);
		setShowHistory(false);
		setSelectedNode(null);
	}, [workflowId, setNodes, setEdges]);

	// Auto layout
	const handleAutoLayout = useCallback(() => {
		setNodes((nds) => {
			const layouted = applyDagreLayout(nds, edges);
			return layouted;
		});
		markDirty();
		window.requestAnimationFrame(() => fitView({ padding: 0.2 }));
	}, [edges, setNodes, markDirty, fitView]);

	// AI assistant apply handler
	const handleAIApply = useCallback((ir: import("../../../shared/types").WorkflowIR, mode: "replace" | "add") => {
		const { nodes: rfNodes, edges: rfEdges } = irToReactFlow(ir);
		if (mode === "replace") {
			setNodes(rfNodes);
			setEdges(rfEdges);
		} else {
			setNodes((nds) => [...nds, ...rfNodes]);
			setEdges((eds) => [...eds, ...rfEdges]);
		}
		// Auto-layout after applying
		setNodes((nds) => {
			const allEdges = mode === "replace" ? rfEdges : [...edges, ...rfEdges];
			return applyDagreLayout(nds, allEdges);
		});
		markDirty();
		setSelectedNode(null);
		window.requestAnimationFrame(() => fitView({ padding: 0.2 }));
	}, [setNodes, setEdges, edges, markDirty, fitView]);

	// Toolbox change handler — update existing edges when edge type changes
	const handleToolboxChange = useCallback((next: WorkflowToolboxState) => {
		if (next.edgeType !== toolbox.edgeType) {
			setEdges((eds) => eds.map((e) => ({ ...e, type: next.edgeType })));
			markDirty();
		}
		setToolbox(next);
	}, [toolbox.edgeType, setEdges, markDirty]);

	// Keyboard shortcuts
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "s") {
				e.preventDefault();
				handleSave();
			}
			if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "h") {
				e.preventDefault();
				setShowHistory((prev) => !prev);
			}
			if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "n") {
				e.preventDefault();
				setShowNodeReference((prev) => !prev);
			}
			if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "a") {
				e.preventDefault();
				setShowAIAssistant((prev) => !prev);
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [handleSave]);

	return (
		<div className="flex-1 flex flex-col bg-[#0d1117]">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-2 border-b border-[#21262d] bg-[#0d1117]/60">
				<div className="flex items-center gap-2">
					{editingName ? (
						<input
							autoFocus
							value={workflowName}
							onChange={(e) => setWorkflowName(e.target.value)}
							onBlur={() => handleNameSave(workflowName)}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleNameSave(workflowName);
								if (e.key === "Escape") setEditingName(false);
								if (e.metaKey || e.ctrlKey) e.stopPropagation();
							}}
							className="text-sm font-semibold text-[#e6edf3] bg-[#0d1117] border border-[#30363d] rounded px-2 py-0.5 outline-none focus:border-[#58a6ff] w-56"
						/>
					) : (
						<button
							onClick={() => setEditingName(true)}
							className="text-sm font-semibold text-[#e6edf3] hover:text-white transition-colors"
						>
							{workflowName || "Untitled Workflow"}
						</button>
					)}
				</div>
				<div className="flex items-center gap-2">
					{isRunning && (
						<span className="flex items-center gap-1.5 text-xs text-[#58a6ff] mr-2">
							<span className="w-1.5 h-1.5 rounded-full bg-[#58a6ff] animate-pulse" />
							Run in progress
						</span>
					)}
					{saveError && (
						<span className="text-xs text-red-400 mr-2">{saveError}</span>
					)}
					{!isRunning && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setShowAIAssistant(true)}
									className="text-[#8b949e] hover:text-[#e6edf3]"
								>
									AI
								</Button>
							</TooltipTrigger>
							<TooltipContent>AI workflow assistant (⌘⇧A)</TooltipContent>
						</Tooltip>
					)}
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowNodeReference(true)}
								className="text-[#8b949e] hover:text-[#e6edf3]"
							>
								Nodes
							</Button>
						</TooltipTrigger>
						<TooltipContent>Node reference (⌘⇧N)</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									const ir = reactFlowToIR(nodes, edges);
									navigator.clipboard.writeText(JSON.stringify(ir, null, 2));
								}}
								className="text-[#8b949e] hover:text-[#e6edf3]"
							>
								Copy JSON
							</Button>
						</TooltipTrigger>
						<TooltipContent>Copy workflow IR as JSON</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowHistory((prev) => !prev)}
								className={showHistory ? "text-[#58a6ff]" : "text-[#8b949e] hover:text-[#e6edf3]"}
							>
								History
							</Button>
						</TooltipTrigger>
						<TooltipContent>Version history (⌘⇧H)</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								size="sm"
								onClick={handleSave}
								disabled={!isDirty || isRunning}
								className={isDirty && !isRunning ? "bg-[#238636] hover:bg-[#2ea043] text-white" : ""}
							>
								{isDirty ? "Save" : "Saved"}
							</Button>
						</TooltipTrigger>
						<TooltipContent>Save workflow (⌘S)</TooltipContent>
					</Tooltip>
				</div>
			</div>

			{/* Editor */}
			<div className="flex-1 flex overflow-hidden">
				{!isRunning && <NodePalette />}
				<div className="flex-1 relative" ref={reactFlowWrapper}>
					<ReactFlow
						nodes={nodes}
						edges={edges}
						onNodesChange={handleNodesChange}
						onEdgesChange={handleEdgesChange}
						onConnect={isRunning ? undefined : onConnect}
						isValidConnection={isValidConnection}
						onNodeClick={isRunning ? undefined : onNodeClick}
						onPaneClick={onPaneClick}
						onDragOver={isRunning ? undefined : onDragOver}
						onDrop={isRunning ? undefined : onDrop}
						nodeTypes={nodeTypes}
						nodesConnectable={!isRunning}
						nodesDraggable={!isRunning}
						elementsSelectable={!isRunning}
						snapToGrid={toolbox.snapToGrid}
						snapGrid={[toolbox.snapGrid, toolbox.snapGrid]}
						panOnScroll={toolbox.panOnScroll}
						fitView
						proOptions={{ hideAttribution: true }}
						defaultEdgeOptions={{
							type: toolbox.edgeType,
							style: { stroke: "#52525b", strokeWidth: 2 },
						}}
					>
						<Background color="#21262d" gap={toolbox.snapToGrid ? toolbox.snapGrid : 20} />
						<Controls />
						{toolbox.showMinimap && (
							<MiniMap
								style={{ backgroundColor: "#161b22" }}
								nodeColor="#30363d"
								maskColor="rgba(0, 0, 0, 0.6)"
							/>
						)}
					</ReactFlow>
					<WorkflowToolbox state={toolbox} onChange={handleToolboxChange} onAutoLayout={!isRunning ? handleAutoLayout : undefined} />
				</div>
				{showHistory ? (
					<VersionHistory
						workflowId={workflowId}
						onRestore={handleRestoreVersion}
						onClose={() => setShowHistory(false)}
					/>
				) : selectedNode ? (
					<NodeConfigPanel
						node={selectedNode}
						lanes={lanes}
						onUpdate={onUpdateNodeData}
						onDelete={onDeleteNode}
					/>
				) : null}
			</div>
			<NodeReferenceModal open={showNodeReference} onOpenChange={setShowNodeReference} />
			<WorkflowAIAssistant
				open={showAIAssistant}
				onOpenChange={setShowAIAssistant}
				hasExistingNodes={nodes.length > 2 || edges.length > 0}
				existingIR={reactFlowToIR(nodes, edges)}
				onApply={handleAIApply}
			/>
		</div>
	);
}

export function WorkflowEditor(props: WorkflowEditorProps) {
	return (
		<ReactFlowProvider>
			<WorkflowEditorInner {...props} />
		</ReactFlowProvider>
	);
}
