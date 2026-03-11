import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";

const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;

/** Handle ordering per node type — left-to-right as rendered. */
const HANDLE_ORDER: Record<string, string[]> = {
	condition: ["TRUE", "FALSE"],
	waitForApproval: ["APPROVED", "REJECTED"],
};

export function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
	const g = new dagre.graphlib.Graph();
	g.setDefaultEdgeLabel(() => ({}));
	g.setGraph({ rankdir: "TB", nodesep: 50, ranksep: 80 });

	for (const node of nodes) {
		const w = node.measured?.width ?? NODE_WIDTH;
		const h = node.measured?.height ?? NODE_HEIGHT;
		g.setNode(node.id, { width: w, height: h });
	}

	for (const edge of edges) {
		g.setEdge(edge.source, edge.target);
	}

	dagre.layout(g);

	const positioned = new Map<string, { x: number; y: number }>();
	for (const node of nodes) {
		const pos = g.node(node.id);
		const nodeW = node.measured?.width ?? NODE_WIDTH;
		const nodeH = node.measured?.height ?? NODE_HEIGHT;
		positioned.set(node.id, { x: pos.x - nodeW / 2, y: pos.y - nodeH / 2 });
	}

	// Build adjacency list
	const childrenOf = new Map<string, string[]>();
	for (const edge of edges) {
		const list = childrenOf.get(edge.source) ?? [];
		list.push(edge.target);
		childrenOf.set(edge.source, list);
	}

	function collectSubtree(rootId: string, excludeId: string): Set<string> {
		const visited = new Set<string>();
		const queue = [rootId];
		while (queue.length > 0) {
			const id = queue.pop()!;
			if (visited.has(id) || id === excludeId) continue;
			visited.add(id);
			for (const child of childrenOf.get(id) ?? []) {
				queue.push(child);
			}
		}
		return visited;
	}

	// For branching nodes with ordered handles, ensure dagre's left/right
	// placement matches the visual handle order.
	for (const node of nodes) {
		const handleOrder = node.type ? HANDLE_ORDER[node.type] : undefined;
		if (!handleOrder || handleOrder.length < 2) continue;

		// Find the two outgoing edges and their target node IDs.
		// Prefer sourceHandle matching, but fall back to edge order.
		const outEdges = edges.filter((e) => e.source === node.id);
		if (outEdges.length !== 2) continue;

		let leftTargetId: string | undefined;
		let rightTargetId: string | undefined;

		// Try to match by sourceHandle
		for (const e of outEdges) {
			if (e.sourceHandle === handleOrder[0]) leftTargetId = e.target;
			if (e.sourceHandle === handleOrder[1]) rightTargetId = e.target;
		}

		// If sourceHandle is missing, determine desired order from current placement:
		// whichever target dagre put on the left should connect to the left handle,
		// so we just need to ensure they don't cross. Since we can't know the
		// user's intent without sourceHandle, assign handles by dagre's x-order
		// and then update the edges' sourceHandle so they connect correctly.
		if (!leftTargetId || !rightTargetId) {
			const t0 = outEdges[0].target;
			const t1 = outEdges[1].target;
			const x0 = positioned.get(t0)?.x ?? 0;
			const x1 = positioned.get(t1)?.x ?? 0;
			if (x0 <= x1) {
				leftTargetId = t0;
				rightTargetId = t1;
			} else {
				leftTargetId = t1;
				rightTargetId = t0;
			}
			// Assign sourceHandle on the edges so React Flow connects to the right handle
			for (const e of outEdges) {
				if (e.target === leftTargetId) e.sourceHandle = handleOrder[0];
				if (e.target === rightTargetId) e.sourceHandle = handleOrder[1];
			}
			// No swap needed — we assigned handles to match dagre's placement
			continue;
		}

		if (leftTargetId === rightTargetId) continue;

		const leftPos = positioned.get(leftTargetId);
		const rightPos = positioned.get(rightTargetId);
		if (!leftPos || !rightPos) continue;

		// Already correct
		if (leftPos.x <= rightPos.x) continue;

		// Collect subtrees, excluding shared nodes (merge points)
		const leftSubtree = collectSubtree(leftTargetId, node.id);
		const rightSubtree = collectSubtree(rightTargetId, node.id);
		const shared: string[] = [];
		for (const id of leftSubtree) {
			if (rightSubtree.has(id)) shared.push(id);
		}
		for (const id of shared) {
			leftSubtree.delete(id);
			rightSubtree.delete(id);
		}
		if (leftSubtree.size === 0 || rightSubtree.size === 0) continue;

		// Sort each subtree's nodes by y then x for stable pairing
		const sortByPos = (ids: Set<string>) =>
			[...ids].sort((a, b) => {
				const pa = positioned.get(a)!;
				const pb = positioned.get(b)!;
				return pa.y - pb.y || pa.x - pb.x;
			});

		const leftSorted = sortByPos(leftSubtree);
		const rightSorted = sortByPos(rightSubtree);

		// Swap x positions between paired nodes
		const pairs = Math.min(leftSorted.length, rightSorted.length);
		for (let i = 0; i < pairs; i++) {
			const lp = positioned.get(leftSorted[i])!;
			const rp = positioned.get(rightSorted[i])!;
			const tmpX = lp.x;
			lp.x = rp.x;
			rp.x = tmpX;
		}

		// Mirror any remaining unpaired nodes across the condition node center
		const condNodeW = node.measured?.width ?? NODE_WIDTH;
		const condCenterX = positioned.get(node.id)!.x + condNodeW / 2;
		const mirrorUnpaired = (ids: string[], startIdx: number) => {
			for (let i = startIdx; i < ids.length; i++) {
				const p = positioned.get(ids[i])!;
				const w = nodes.find((n) => n.id === ids[i])?.measured?.width ?? NODE_WIDTH;
				const centerX = p.x + w / 2;
				p.x = condCenterX + (condCenterX - centerX) - w / 2;
			}
		};
		if (leftSorted.length > pairs) mirrorUnpaired(leftSorted, pairs);
		if (rightSorted.length > pairs) mirrorUnpaired(rightSorted, pairs);
	}

	return nodes.map((node) => {
		const pos = positioned.get(node.id)!;
		return { ...node, position: pos };
	});
}
