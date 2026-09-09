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

## Packaged builds & updates

Ship installers so people can download Phantasmal without cloning the repo.

### Publish from GitHub Actions (recommended)

1. Bump `"version"` in `package.json` (e.g. `0.0.2`) and push to `main`, **or** pass the
   version when you run the workflow.
2. GitHub → **Actions** → **Release** → **Run workflow**.
3. Optionally set the version / mark the release as a draft.
4. The workflow builds Linux (AppImage), macOS (dmg + zip), and Windows (NSIS) and uploads
   them to a [GitHub Release](https://github.com/Nevnet99/phantasmal/releases).

You can also push a tag like `v0.0.2` (matching `package.json`) to trigger the same workflow.

### Local build / publish

```bash
# Build Linux AppImage / macOS dmg+zip / Windows NSIS into release/
bun run dist

# Build and publish to GitHub Releases (set GH_TOKEN with repo scope)
bun run release
```

Packaged apps check Releases from **Settings → Updates**, download, then **Restart & install**.
Dev mode (`bun run dev`) cannot auto-update — only packaged installs can.

macOS artifacts from CI are unsigned until you add Apple signing secrets.
