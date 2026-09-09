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
Soon badge. Track is the default screen after vault setup.

Geist Variable for UI/display, Geist Mono for paths and meta, Material Symbols
Outlined Variable for icons (same self-hosted `@fontsource-variable` approach).

- **Design system:** Lit web components under `src/design-system/` (`ds-button`,
  `ds-icon`, `ds-toggle`, …)
- **App screens:** Alpine.js + HTML (`index.html`, `src/app/`) — keep app JS thin
- Do not build feature screens as Lit elements; compose `ds-*` primitives from Alpine markup instead
- First-run flow: `welcome` → `setup` (vault folder) → `app`. Returning users with an open vault skip straight to `app` on Track.
- **Settings** (sidebar): tabs for **UI** (theme + layout density), **Habits**
  (daily reminder + archived habits/identities browse/restore), and **Vault** (path / move / open).
- Default chrome is **compact** (0 radius, tight spacing) and **dark**. Prefs are stored per machine in
  `userData/config.json` as `uiDensity` (`compact` | `comfortable` | `roomy`),
  `uiTheme` (`dark` | `light` | `system`), and `dailyReminder` (boolean; once-per-day
  OS notification when habits remain due). Dock/taskbar badge shows remaining due today.

## Data vault

The vault is a folder of files (Obsidian-style), not a SQLite database:

```
Vault/
  phantasmal.json
  habits/
    morning-run-a1b2c3.json
  identity/
    writer-a1b2c3.json
  journal/
```

Each habit is one JSON file under `habits/` (name, cue, note, schedule, completion days,
optional archive metadata).
Each identity is one JSON file under `identity/` (statement, note, linked habit ids,
optional archive metadata).
**Track** covers today’s list, month calendar, contribution graph, and check-offs.
Add habits with **New habit**; edit with the **Edit** control beside each row.
Click the habit card to complete it. **Remove** opens a dialog to archive (keeps graph
history, optional note) or delete permanently. Browse and restore archived habits under
Settings → Habits. The remove dialog traps focus and closes on Escape.

**Identity** is who you want to become. Add statements (“I am a writer”), optionally link
habits, and count check-offs on those habits as votes for the identity. Cards show total
votes, today/this week, and recent evidence. Track groups today’s due list under linked
identities (a whole stack stays in one group) and shows how many votes are still open.
Archive identities from the remove dialog; restore under Settings → Habits.

Schedules: `daily`, `weekly` (weekdays + interval weeks, e.g. every other Monday), or
`every_n_days`. Track only lists habits due on the selected day; streaks count consecutive
due days.

Habit stacking: set `stackAfterId` (“After X, I will Y”). Track groups stacks in order and
indents stacked habits. Use the up/down controls on Track to reorder siblings or promote /
demote a habit in a chain.

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
