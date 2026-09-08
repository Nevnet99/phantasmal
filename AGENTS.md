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

## Data vault

The vault is a folder of files (Obsidian-style), not a SQLite database:

```
Vault/
  phantasmal.json
  habits/
  journal/
```

Choose the folder in the UI. Point both machines at the same synced folder
(Google Drive, Dropbox, etc.). Each machine only stores that path in
`userData/config.json`. Habits and journal entries will be separate files so
cloud sync can merge edits from either machine.

## Documentation

- [Lit](https://lit.dev/docs/)
- [Electron](https://www.electronjs.org/docs/latest)
- [Vite](https://vite.dev/guide/)
- [oxlint](https://oxc.rs/docs/guide/usage/linter.html)
