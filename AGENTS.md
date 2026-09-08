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

## Stack

- Electron + Lit + TypeScript
- Bun package manager
- oxlint + Prettier
- Vitest

## Documentation

- [Lit](https://lit.dev/docs/)
- [Electron](https://www.electronjs.org/docs/latest)
- [Vite](https://vite.dev/guide/)
- [oxlint](https://oxc.rs/docs/guide/usage/linter.html)
