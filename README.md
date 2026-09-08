# Phantasmal

Local-first Atomic Habits workspace (Electron + Lit). Track habits, design systems for change, break bad habits, and journal — with SQLite on disk and optional export later.

## Requirements

- Node `>=22.12.0`
- [Bun](https://bun.sh)

## Scripts

| Command | Purpose |
| --- | --- |
| `bun run dev` | Vite + Electron window |
| `bun run build` | Typecheck and production bundles |
| `bun run lint` | oxlint |
| `bun run format` | Prettier write |
| `bun run test` | Vitest |
| `bun run check` | lint → format:check → test → build |

## Setup

```bash
bun install
bun run dev
```
