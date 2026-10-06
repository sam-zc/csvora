# CSVora — Agent Context & Rules

CSVora is an open-source visual CSV and table designer enabling users to inspect, format, customize, and export tabular data across web, desktop, and CLI interfaces.

## Monorepo Architecture

```
csvora/
├── apps/
│   ├── web/           # Next.js 16 (App Router) + React 19 frontend
│   └── api/           # Standalone Fastify backend running on Bun
└── packages/
    ├── csv-core/      # Portable CSV domain logic (parsing, normalization, delimiter detection)
    ├── table-engine/  # Portable table formatting & presentation models
    ├── schemas/       # Shared Zod contracts & derived types
    ├── ui/            # Reusable UI presentation components (shadcn/ui + Tailwind v4)
    └── config/        # Shared TypeScript configurations
```

### Dependency Direction

- `apps/web` → `@csvora/ui`, `@csvora/csv-core`, `@csvora/table-engine`, `@csvora/schemas`
- `apps/api` → `@csvora/schemas` (and portable domain packages when helpful)
- **Packages must NEVER import from `apps/*`.**
- **Domain packages (`csv-core`, `table-engine`) must remain framework-independent.**
- Avoid deep imports (e.g., `@csvora/csv-core/src/internal`). Always consume packages through their deliberate public exports (`@csvora/csv-core`).

## Runtime and Package Manager

- **Bun** (v1.4.0+) is the canonical package manager, test runner, and API runtime.
- Exactly one root lockfile: `bun.lock`. Do not add npm, yarn, or pnpm lockfiles.
- Workspace packages use `workspace:*` for internal dependencies.
- Monorepo tasks are orchestrated with Turborepo (`turbo`).

## TypeScript Rules

- Strict TypeScript everywhere (`strict: true`, `noImplicitAny: true`).
- Strictly avoid `any` and `as any`.
- Prefer `unknown`, generics, schema validation (`z.infer`), narrowing, and discriminated unions.
- Do not silence compiler errors with `@ts-ignore` or broad exclusions.

## React & Frontend Rules (`apps/web`, `packages/ui`)

- React 19 and Next.js 16 App Router conventions apply.
- Use Server Components by default; only use `'use client'` when browser state or event handlers are required.
- Keep render functions pure with no side effects during render.
- Keep presentation components in `@csvora/ui` using shadcn/ui and Tailwind CSS v4. No CSV parsing or domain business logic in `@csvora/ui`.
- Consult installed skills (`frontend-design`, `apple-design`) for design guidelines.

## Backend Rules (`apps/api`)

- Fastify running standalone on Bun. Do not replace with Next.js route handlers.
- Idiomatic route registration; no enterprise boilerplate, repositories, or heavy DI containers for simple endpoints.
- Structured logging enabled via Fastify logger.
- Graceful startup and shutdown handling `SIGINT` and `SIGTERM`.

## Testing Expectations

- **Unit tests**: Use Bun Test (`bun:test`) in domain packages and API. Fast, co-located in `test/`.
- **E2E tests**: Use Playwright in `apps/web/e2e`. Verify user flows and UI shells.
- All tests must pass cleanly before finalizing tasks.

## Security Principles & CSV Safety

CSV content is untrusted user input:

- **Never render raw CSV content as HTML**; never use `dangerouslySetInnerHTML` for CSV cells.
- **Never evaluate uploaded code or formulas** with `eval` or dynamic Function calls.
- **Prevent spreadsheet formula injection (CSV injection)**: when exporting CSV or XLSX, neutralize cells beginning with `=`, `+`, `-`, or `@`.
- **Validate server-side inputs** strictly using `@csvora/schemas`.
- Never trust file extensions or MIME types alone.
- Sanitize file names and avoid leaking local filesystem paths.

## Performance Principles

- Parse independently from rendering; do not block the UI thread on large CSV files.
- Keep transformations pure and avoid unnecessary full-dataset copies in memory.
- For large tables, use virtualization (deferred to table preview feature task); never render thousands of raw DOM nodes directly.
- Server-side parsing will support streaming in future iterations without holding entire uploads in memory.

## Future Portability & Code Placement

CSVora targets multiple future clients:

- Web application (`apps/web`)
- Desktop application (Electron)
- VS Code extension
- Command-line interface (CLI)

Therefore, core parsing, normalization, and table presentation rules must NEVER depend on React, DOM APIs, Fastify, or Bun-specific modules. Keep them portable in `@csvora/csv-core` and `@csvora/table-engine`.

## Agent skills

### Issue tracker

Local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context (centralized `GLOSSARY.md` and `docs/adr/` at repo root). See `docs/agents/domain.md`.
