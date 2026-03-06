import { defineConfig } from "drizzle-kit";

export default defineConfig({
	out: "./drizzle/migrations",
	schema: "./src/bun/db/schema.ts",
	dialect: "sqlite",
});
