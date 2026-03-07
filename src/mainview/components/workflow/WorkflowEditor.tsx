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
import type { WorkflowIR, Lane } from "../../../shared/types";
import { useWorkflow } from "../../hooks/useWorkflow";
import { irToReactFlow, reactFlowToIR, validateIR, getDefaultConfig, getNodeLabel } from "../../lib/workflow-ir";
import { nodeTypes } from "./nodes";
import { NodePalette } from "./NodePalette";
import { NodeConfigPanel } from "./NodeConfigPanel";
import { Button } from "../ui/button";

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
	const [editingName, setEditingName] = useState(false);
	const reactFlowWrapper = useRef<HTMLDivElement>(null);
	const { screenToFlowPosition } = useReactFlow();

	// Load workflow
	useEffect(() => {
		(async () => {
			const workflow = await getWorkflow(workflowId);
			if (workflow) {
				const { nodes: rfNodes, edges: rfEdges } = irToReactFlow(workflow.definition);
				setNodes(rfNodes);
				setEdges(rfEdges);
				setWorkflowName(workflow.name);
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
			type: "smoothstep",
			style: { stroke: "#52525b" },
		};
		setEdges((eds) => addEdge(newEdge, eds));
		markDirty();
	}, [setEdges, markDirty]);

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
		if (trimmed && trimmed !== workflowName) {
			await updateWorkflow(workflowId, { name: trimmed });
			setWorkflowName(trimmed);
			onNameChange?.(workflowId, trimmed);
		}
		setEditingName(false);
	}, [workflowName, workflowId, updateWorkflow, onNameChange]);

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

	// Keyboard shortcut for save
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "s") {
				e.preventDefault();
				handleSave();
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [handleSave]);

	return (
		<div className="flex-1 flex flex-col bg-zinc-950">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/40 bg-zinc-900/30">
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
							}}
							className="text-sm font-semibold text-zinc-200 bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 outline-none focus:border-violet-500 w-56"
						/>
					) : (
						<button
							onClick={() => setEditingName(true)}
							className="text-sm font-semibold text-zinc-200 hover:text-zinc-50 transition-colors"
						>
							{workflowName || "Untitled Workflow"}
						</button>
					)}
				</div>
				<div className="flex items-center gap-2">
					{saveError && (
						<span className="text-xs text-red-400 mr-2">{saveError}</span>
					)}
					<Button
						size="sm"
						onClick={handleSave}
						disabled={!isDirty}
						className={isDirty ? "bg-violet-600 hover:bg-violet-500 text-white" : ""}
					>
						{isDirty ? "Save" : "Saved"}
					</Button>
				</div>
			</div>

			{/* Editor */}
			<div className="flex-1 flex overflow-hidden">
				<NodePalette />
				<div className="flex-1" ref={reactFlowWrapper}>
					<ReactFlow
						nodes={nodes}
						edges={edges}
						onNodesChange={handleNodesChange}
						onEdgesChange={handleEdgesChange}
						onConnect={onConnect}
						isValidConnection={isValidConnection}
						onNodeClick={onNodeClick}
						onPaneClick={onPaneClick}
						onDragOver={onDragOver}
						onDrop={onDrop}
						nodeTypes={nodeTypes}
						fitView
						proOptions={{ hideAttribution: true }}
						defaultEdgeOptions={{
							type: "smoothstep",
							style: { stroke: "#52525b", strokeWidth: 2 },
						}}
					>
						<Background color="#27272a" gap={20} />
						<Controls />
						<MiniMap
							style={{ backgroundColor: "#18181b" }}
							nodeColor="#3f3f46"
							maskColor="rgba(0, 0, 0, 0.6)"
						/>
					</ReactFlow>
				</div>
				{selectedNode && (
					<NodeConfigPanel
						node={selectedNode}
						lanes={lanes}
						onUpdate={onUpdateNodeData}
						onDelete={onDeleteNode}
					/>
				)}
			</div>
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
