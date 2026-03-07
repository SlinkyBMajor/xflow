import type { ElectrobunConfig } from "electrobun";

export default {
	app: {
		name: "XFlow",
		identifier: "com.xflow.app",
		version: "0.1.0",
	},
	runtime: {
		exitOnLastWindowClosed: true,
	},
	build: {
		copy: {
			"dist/index.html": "views/mainview/index.html",
			"dist/assets": "views/mainview/assets",
			"drizzle/migrations": "bun/migrations",
		},
		watchIgnore: ["dist/**"],
		mac: {
			bundleCEF: false,
		},
		linux: {
			bundleCEF: false,
		},
		win: {
			bundleCEF: false,
		},
	},
} satisfies ElectrobunConfig;
