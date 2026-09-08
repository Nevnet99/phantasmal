## Development

When starting the app, use:

```
bun run dev
```

That starts Vite and launches the Electron window via `vite-plugin-electron`.
The `dev` script clears `ELECTRON_RUN_AS_NODE` so Electron boots as a GUI app
(agent/automation shells sometimes set that flag and break startup).

Run the full quality gate before committing:

```
bun run check
```

## App shell

After vault setup, the app uses a sidebar + main layout. Routes live in
`src/app/nav.ts`. Unfinished features stay reachable as stub screens and show a
Soon badge. Home lists every section with a short blurb.

Geist Variable for UI/display, Geist Mono for paths and meta (same loading approach as lukebrannagan-3).

- **Design system:** Lit web components under `src/design-system/`
- **App screens:** Alpine.js + HTML (`index.html`, `src/app/`) — keep app JS thin
- Do not build feature screens as Lit elements; compose `ds-*` primitives from Alpine markup instead
- First-run flow: `welcome` → `setup` (vault folder) → `app`. Returning users with an open vault skip straight to `app`.
- **Settings** (sidebar): tabs for **UI** (theme + layout density) and **Vault** (path / move / open).
- Default chrome is **compact** (0 radius, tight spacing) and **dark**. Prefs are stored per machine in
  `userData/config.json` as `uiDensity` (`compact` | `comfortable` | `roomy`) and
  `uiTheme` (`dark` | `light` | `system`).

## Data vault

The vault is a folder of files (Obsidian-style), not a SQLite database:

```
Vault/
  phantasmal.json
  habits/
  journal/
```

Choose the folder during setup or later under Settings → Vault. Point both machines at
the same synced folder (Google Drive, Dropbox, etc.). Each machine only stores that path
(and UI prefs) in `userData/config.json`. Habits and journal entries will be separate
files so cloud sync can merge edits from either machine.

## Documentation

- [Lit](https://lit.dev/docs/) (design system)
- [Alpine.js](https://alpinejs.dev/) (app UI)
- [Electron](https://www.electronjs.org/docs/latest)
- [Vite](https://vite.dev/guide/)
- [oxlint](https://oxc.rs/docs/guide/usage/linter.html)
