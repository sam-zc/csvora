# CSVora

> Turn raw CSV data into beautiful tables.

CSVora is an open-source visual CSV and table designer.

> [!NOTE]
> **Project Status**: CSVora is in early-stage active development. In-browser CSV ingestion, parsing diagnostics, presentation models, and virtualized table preview are functional. Future phases will introduce column inspection, custom formatting presets, theme customization, and exports.

## Long-term Vision

CSVora will enable users to:

- Upload CSV files and preview interactive tables
- Infer and adjust column data types (strings, numbers, booleans, dates)
- Format currencies, percentages, decimals, and custom presentation rules
- Customize themes, alignments, widths, and conditional formatting
- Export datasets safely into portable formats (Raw CSV, Formatted CSV, Markdown table, and lossless JSON) across web, desktop, and CLI clients

## Architecture & Monorepo Layout

```
csvora/
├── apps/
│   ├── web/           # Next.js 16 (App Router) + React 19 frontend
│   └── api/           # Standalone Fastify backend running on Bun
└── packages/
    ├── csv-core/      # Portable CSV domain logic (parsing, normalization, RFC 4180 serialization)
    ├── export/        # Portable export pipeline (raw CSV, formatted CSV, Markdown, JSON)
    ├── table-engine/  # Portable table formatting & presentation models
    ├── schemas/       # Shared Zod runtime schemas & TypeScript types
    ├── ui/            # Reusable UI presentation components (shadcn/ui + Tailwind v4)
    └── config/        # Shared TypeScript configurations
```

### Dependency Rules

- `apps/web` → `@csvora/ui`, `@csvora/export`, `@csvora/csv-core`, `@csvora/table-engine`, `@csvora/schemas`
- `@csvora/export` → `@csvora/csv-core`, `@csvora/table-engine`, `@csvora/schemas`
- `apps/api` → `@csvora/schemas` (and core domain packages as needed)
- Packages never import from `apps/*`.
- Domain packages (`csv-core`, `table-engine`, `export`) are pure TypeScript and remain framework-independent.

## Tech Stack

- **Runtime & Package Manager**: [Bun](https://bun.sh) (v1.4.0+)
- **Monorepo Orchestration**: [Turborepo](https://turbo.build)
- **Frontend**: [Next.js 16](https://nextjs.org), [React 19](https://react.dev), [Tailwind CSS v4](https://tailwindcss.com)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com) in `packages/ui`
- **Backend**: [Fastify 5](https://fastify.dev) running on Bun
- **Validation**: [Zod](https://zod.dev) in `packages/schemas`
- **Linter & Formatter**: [Oxlint](https://oxc.rs) & [Oxfmt](https://oxc.rs)
- **Testing**: Bun Test (unit tests) & [Playwright](https://playwright.dev) (E2E smoke tests)

## Prerequisites

- [Bun](https://bun.sh) v1.4.0 or later installed on your system.
- Node.js is not required; Bun is the canonical runtime and package manager.

## Getting Started

### 1. Installation

```bash
bun install
```

### 2. Development

Run all applications in parallel:

```bash
bun run dev
```

Or run applications individually:

```bash
# Frontend only (http://localhost:3000)
bun --filter @csvora/web dev

# API backend only (http://localhost:3001)
bun --filter @csvora/api dev
```

### 3. Build

```bash
bun run build
```

### 4. Testing

Run unit tests across all packages (Bun Test):

```bash
bun run test
```

Run end-to-end smoke tests (Playwright):

```bash
bun run test:e2e
```

### 5. Linting & Formatting

```bash
# Lint with Oxlint
bun run lint

# Check formatting with Oxfmt
bun run format:check

# Format files with Oxfmt
bun run format

# Typecheck with TypeScript
bun run typecheck
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines and development practices.

## License

MIT © [CSVora Contributors](./LICENSE)
