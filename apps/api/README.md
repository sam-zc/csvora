# @csvora/api

Standalone backend service for CSVora built with Fastify running on the Bun runtime.

## Endpoints

- `GET /health`: Health check endpoint returning `{ "status": "ok" }`

## Scripts

- `bun run dev`: Start API server in watch mode
- `bun run build`: Bundle backend for Bun
- `bun run start`: Run production bundle
- `bun run test`: Run unit tests with Bun Test
- `bun run lint`: Lint code with Oxlint
- `bun run typecheck`: Check TypeScript types
