import { useState, useCallback } from "react";
import { rpc } from "../rpc";
import type { BoardTemplate } from "../../shared/types";

export function useTemplates() {
	const [templates, setTemplates] = useState<BoardTemplate[]>([]);
	const [loading, setLoading] = useState(false);

	const fetchTemplates = useCallback(async () => {
		setLoading(true);
		const result = await rpc.request.listTemplates({});
		setTemplates(result);
		setLoading(false);
	}, []);

	const exportBoard = useCallback(async (name: string, description?: string) => {
		const template = await rpc.request.exportBoardAsTemplate({ name, description });
		await fetchTemplates();
		return template;
	}, [fetchTemplates]);

	const applyTemplate = useCallback(async (templateId: string) => {
		await rpc.request.applyTemplate({ templateId });
	}, []);

	const deleteTemplate = useCallback(async (id: string) => {
		await rpc.request.deleteTemplate({ id });
		await fetchTemplates();
	}, [fetchTemplates]);

	return { templates, loading, fetchTemplates, exportBoard, applyTemplate, deleteTemplate };
}
