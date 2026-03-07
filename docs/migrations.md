# Database Migrations

## Overview

XFlow uses Drizzle ORM with `bun:sqlite`. Each project stores its database at `<projectPath>/.xflow/db.sqlite`. Migrations run automatically when a project is opened.

## Source location

Migration files live at `drizzle/migrations/` in the project root. Generated via:

```sh
bun run db:generate
```

## Bundling

Electrobun bundles the bun process into a single `app/bun/index.js`. The migrations folder is **not** included automatically — it must be copied into the bundle via `electrobun.config.ts`:

```ts
copy: {
  "drizzle/migrations": "bun/migrations",
},
```

In `src/bun/db/migrate.ts`, the path references the co-located directory:

```ts
migrate(db, { migrationsFolder: `${import.meta.dir}/migrations` });
```

At runtime, `import.meta.dir` resolves to `app/bun/`, where both `index.js` and `migrations/` live.

## Adding a new migration

1. Edit the schema in `src/bun/db/schema.ts`
2. Run `bun run db:generate` to create the migration SQL
3. Rebuild the app — the new migration files will be copied into the bundle automatically
