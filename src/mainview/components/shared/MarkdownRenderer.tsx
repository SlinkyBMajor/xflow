import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const components: Components = {
	h1: ({ children }) => <h1 className="text-lg font-semibold text-[#e6edf3] mt-4 mb-2 first:mt-0">{children}</h1>,
	h2: ({ children }) => <h2 className="text-base font-semibold text-[#e6edf3] mt-3.5 mb-2 first:mt-0">{children}</h2>,
	h3: ({ children }) => <h3 className="text-sm font-semibold text-[#e6edf3] mt-3 mb-1.5 first:mt-0">{children}</h3>,
	h4: ({ children }) => <h4 className="text-sm font-medium text-[#e6edf3] mt-2.5 mb-1 first:mt-0">{children}</h4>,
	p: ({ children }) => <p className="text-[12px] text-[#e6edf3] leading-relaxed mb-2 last:mb-0">{children}</p>,
	a: ({ href, children }) => (
		<a href={href} className="text-[#58a6ff] hover:underline" target="_blank" rel="noopener noreferrer">
			{children}
		</a>
	),
	ul: ({ children }) => <ul className="text-[12px] text-[#e6edf3] list-disc pl-5 mb-2 space-y-0.5">{children}</ul>,
	ol: ({ children }) => <ol className="text-[12px] text-[#e6edf3] list-decimal pl-5 mb-2 space-y-0.5">{children}</ol>,
	li: ({ children }) => <li className="leading-relaxed">{children}</li>,
	blockquote: ({ children }) => (
		<blockquote className="border-l-2 border-[#30363d] pl-3 my-2 text-[#8b949e]">{children}</blockquote>
	),
	code: ({ className, children }) => {
		const isBlock = className?.includes("language-");
		if (isBlock) {
			return (
				<code className="block bg-[#161b22] border border-[#30363d] rounded-md p-3 text-[11px] font-mono text-[#e6edf3] overflow-x-auto">
					{children}
				</code>
			);
		}
		return (
			<code className="bg-[#21262d] text-[#e6edf3] px-1 py-0.5 rounded text-[11px] font-mono">
				{children}
			</code>
		);
	},
	pre: ({ children }) => <div className="mb-2 last:mb-0">{children}</div>,
	table: ({ children }) => (
		<div className="overflow-x-auto mb-2">
			<table className="text-[12px] text-[#e6edf3] border-collapse w-full">{children}</table>
		</div>
	),
	thead: ({ children }) => <thead className="border-b border-[#30363d]">{children}</thead>,
	th: ({ children }) => <th className="text-left px-2 py-1.5 font-medium text-[#8b949e]">{children}</th>,
	td: ({ children }) => <td className="px-2 py-1.5 border-t border-[#21262d]">{children}</td>,
	hr: () => <hr className="border-[#21262d] my-3" />,
};

export function looksLikeMarkdown(text: string): boolean {
	return /^#{1,4}\s|```|^\s*[-*]\s|\*\*|__|\[.+\]\(.+\)|^\s*\d+\.\s/m.test(text);
}

export function MarkdownRenderer({ content, className }: { content: string; className?: string }) {
	return (
		<div className={className}>
			<ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
				{content}
			</ReactMarkdown>
		</div>
	);
}
