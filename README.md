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

## Vault location

The habit database is a single SQLite file (`phantasmal.db`). In the app you can:

- **Choose folder…** — creates or opens `phantasmal.db` inside that folder (use a Google Drive / Dropbox directory to share across machines)
- **Open .db file…** — point at an existing database
- **Use Documents/Phantasmal** — local default under your Documents folder

Each machine stores only a pointer to that path in its local app config.
