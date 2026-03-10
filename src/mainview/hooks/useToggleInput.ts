import { useState, useRef, useEffect } from "react";

export function useToggleInput(onSubmit: (value: string) => void) {
	const [active, setActive] = useState(false);
	const [value, setValue] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (active) inputRef.current?.focus();
	}, [active]);

	const handleSubmit = () => {
		const trimmed = value.trim();
		if (trimmed) {
			onSubmit(trimmed);
		}
		setValue("");
		setActive(false);
	};

	const inputProps = {
		ref: inputRef,
		value,
		onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value),
		onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter") handleSubmit();
			if (e.key === "Escape") {
				setValue("");
				setActive(false);
			}
		},
		onBlur: handleSubmit,
	};

	return { active, setActive, value, setValue, inputRef, inputProps };
}
