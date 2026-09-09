# Phantasmal

Local-first habit workspace (Electron) plus an Astro marketing site — Nx monorepo.

**License:** [MIT](./LICENSE)

**UI (desktop):** Lit for the design system only; Alpine.js for app screens (minimal JS).

## Layout

```
apps/
  desktop/    Electron + Vite app
  marketing/  Astro site (phantasmal.app)
```

## Download

Grab the latest build from
[GitHub Releases](https://github.com/Nevnet99/phantasmal/releases/latest).

| Platform | File to download |
| --- | --- |
| Linux | `.AppImage` |
| macOS | `.dmg` (or `.zip`) |
| Windows | `.exe` installer (NSIS) |

**Linux:** make the AppImage executable, then run it:

```bash
chmod +x Phantasmal-*.AppImage
./Phantasmal-*.AppImage
```

**macOS:** open the `.dmg`, drag Phantasmal into Applications, then launch it.
Builds are currently unsigned — if Gatekeeper blocks it, right-click the app → **Open**,
or allow it under **System Settings → Privacy & Security**.

**Windows:** run the `.exe` installer and follow the prompts.

After install, open **Settings → Updates** to check for newer releases. Auto-update only
works in these packaged apps, not when running from source with `bun run dev`.

## Requirements (from source)

- Node `>=22.12.0`
- [Bun](https://bun.sh)

## Scripts

| Command | Purpose |
| --- | --- |
| `bun run dev` | Desktop: Vite + Electron |
| `bun run dev:marketing` | Marketing: Astro on :4321 |
| `bun run build` | Build all apps (Nx) |
| `bun run lint` | oxlint across apps |
| `bun run format` | Prettier write |
| `bun run test` | Vitest (desktop) |
| `bun run check` | lint → format:check → typecheck → test → build |
| `bun run dist` / `bun run release` | Package / publish desktop |
| `bun run sync:downloads -- --version 0.0.2` | Pull release installers into the marketing site (CI does this) |

## Download page

`/download` detects Linux / macOS / Windows and offers the matching installer.

Stable files live in `apps/marketing/public/downloads/` (Git LFS):

- `phantasmal-linux.AppImage`
- `phantasmal-mac.dmg`
- `phantasmal-windows.exe`

After each **Release** workflow run (non-draft), CI opens a PR that updates those files and `manifest.json`. Merge that PR so the deployed marketing site serves the new builds.

Until the first sync lands, the download page falls back to [GitHub Releases](https://github.com/Nevnet99/phantasmal/releases/latest).

## Marketing site (Vercel)

Host `apps/marketing` on Vercel:

1. Import the GitHub repo in Vercel.
2. Set **Root Directory** to `apps/marketing`.
3. Framework: Astro (see `apps/marketing/vercel.json`).
4. Production branch: `main` (or merge download-image PRs so prod gets new installers).

```bash
bun run dev:marketing
```

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

## Setup (from source)

```bash
bun install
bun run dev
```

Marketing site:

```bash
bun run dev:marketing
```

## Packaged builds & updates

Ship installers so people can download Phantasmal without cloning the repo.

### Publish from GitHub Actions (recommended)

1. Bump `"version"` in `apps/desktop/package.json` (e.g. `0.0.2`) and push to `main`, **or** pass the
   version when you run the workflow.
2. GitHub → **Actions** → **Release** → **Run workflow**.
3. Optionally set the version / mark the release as a draft.
4. The workflow builds Linux (AppImage), macOS (dmg + zip), and Windows (NSIS) and uploads
   them to a [GitHub Release](https://github.com/Nevnet99/phantasmal/releases).
5. Unless the release is a draft, a follow-up job copies those installers into
   `apps/marketing/public/downloads/` and opens a PR. Merge it to update the site’s `/download` page.

You can also push a tag like `v0.0.2` (matching `apps/desktop/package.json`) to trigger the same workflow.

### Local build / publish

```bash
# Build Linux AppImage / macOS dmg+zip / Windows NSIS into apps/desktop/release/
bun run dist

# Build and publish to GitHub Releases (set GH_TOKEN with repo scope)
bun run release
```

Packaged apps check Releases from **Settings → Updates**, download, then **Restart & install**.
Dev mode (`bun run dev`) cannot auto-update — only packaged installs can.

macOS artifacts from CI are unsigned until you add Apple signing secrets.
