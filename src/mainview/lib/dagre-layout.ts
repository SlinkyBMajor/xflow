import dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";

const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;

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

	return nodes.map((node) => {
		const pos = g.node(node.id);
		const nodeW = node.measured?.width ?? NODE_WIDTH;
		const nodeH = node.measured?.height ?? NODE_HEIGHT;
		return {
			...node,
			position: {
				x: pos.x - nodeW / 2,
				y: pos.y - nodeH / 2,
			},
		};
	});
}
