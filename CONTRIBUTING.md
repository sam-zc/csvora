# Contributing to CSVora

Thank you for your interest in contributing to CSVora!

CSVora is an open-source visual CSV and table designer. The repository is currently in its early foundational stage.

## Prerequisites

- [Bun](https://bun.sh) (v1.4.0 or later)
- Git

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/csvora/csvora.git
   cd csvora
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Start development servers:
   ```bash
   bun run dev
   ```

## Development Commands

- `bun run dev`: Run both web and API in development mode via Turborepo
- `bun run build`: Build all applications and packages
- `bun run test`: Run unit tests with Bun Test
- `bun run test:e2e`: Run end-to-end tests with Playwright
- `bun run lint`: Lint code with Oxlint
- `bun run format`: Format code with Oxfmt
- `bun run format:check`: Check formatting with Oxfmt
- `bun run typecheck`: Check types across all packages with TypeScript

To work on an individual app or package:

```bash
bun --filter @csvora/web dev
bun --filter @csvora/api dev
```

## Architectural Guidelines

- **Strict TypeScript**: No `any` or `as any`. Use discriminated unions, generics, and schema validation.
- **Pure Domain Packages**: `@csvora/csv-core` and `@csvora/table-engine` must remain portable and framework-independent. Never import React, Fastify, DOM APIs, or database drivers into domain packages.
- **Dependency Direction**: Applications (`apps/*`) may depend on packages (`packages/*`). Packages may never import from applications.
- **Shared Schemas**: Runtime contracts belong in `@csvora/schemas` using Zod. Derive TypeScript types using `z.infer`.
- **UI Components**: Reusable presentation components belong in `@csvora/ui`. No CSV business logic in the UI package.
- **Security First**: All CSV inputs are untrusted. Never use `dangerouslySetInnerHTML`, avoid `eval`, sanitize filenames, and neutralize formula injection characters (`=`, `+`, `-`, `@`) when exporting.

## Commit Guidelines

Follow conventional commit formats (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).
