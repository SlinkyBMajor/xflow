import type { NodeTypes } from "@xyflow/react";
import { StartNode } from "./StartNode";
import { EndNode } from "./EndNode";
import { ClaudeAgentNode } from "./ClaudeAgentNode";
import { CustomScriptNode } from "./CustomScriptNode";
import { NotifyNode } from "./NotifyNode";
import { WaitForApprovalNode } from "./WaitForApprovalNode";
import { MoveToLaneNode } from "./MoveToLaneNode";
import { ConditionNode } from "./ConditionNode";
import { SetMetadataNode } from "./SetMetadataNode";
import { LogNode } from "./LogNode";

export const nodeTypes: NodeTypes = {
	start: StartNode,
	end: EndNode,
	claudeAgent: ClaudeAgentNode,
	customScript: CustomScriptNode,
	notify: NotifyNode,
	waitForApproval: WaitForApprovalNode,
	moveToLane: MoveToLaneNode,
	condition: ConditionNode,
	setMetadata: SetMetadataNode,
	log: LogNode,
};
