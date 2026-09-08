# Phantasmal

Local-first Atomic Habits workspace (Electron). Track habits, design systems for change, break bad habits, and journal — with an Obsidian-style file vault you can sync via Google Drive or Dropbox.

**UI:** Lit for the design system only; Alpine.js for app screens (minimal JS).

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

Your data lives in a **folder** (not a single database file):

```
Phantasmal/
  phantasmal.json
  habits/
  journal/
```

In the app you can:

- **Choose folder…** — create or use a vault folder (put this in Drive/Dropbox to share across machines)
- **Open existing vault…** — pick a folder that already has `phantasmal.json`
- **Use Documents/Phantasmal** — local default under your Documents folder

Each machine stores only a pointer to that folder in its local app config. Edit from either machine; sync conflicts stay scoped to individual files, like Obsidian.

## Setup

```bash
bun install
bun run dev
```
