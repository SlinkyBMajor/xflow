import { useState, useEffect, useCallback } from "react";

export function useRpcListData<T>(
	id: string | null,
	fetchFn: (id: string) => Promise<T[]>,
	subscribeFn: (callback: (item: T) => void) => () => void,
	matchFn: (item: T, id: string) => boolean,
	mergeFn: (prev: T[], item: T) => T[],
) {
	const [data, setData] = useState<T[]>([]);

	const fetch = useCallback(async () => {
		if (!id) {
			setData([]);
			return;
		}
		const result = await fetchFn(id);
		setData(result);
	}, [id, fetchFn]);

	useEffect(() => {
		fetch();
	}, [fetch]);

	useEffect(() => {
		if (!id) return;
		return subscribeFn((item) => {
			if (matchFn(item, id)) {
				setData((prev) => mergeFn(prev, item));
			}
		});
	}, [id, subscribeFn, matchFn, mergeFn]);

	return { data, refresh: fetch, setData };
}
