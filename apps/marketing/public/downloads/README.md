# Site download images (electron-builder installers)

Release workflow copies the latest AppImage / DMG / NSIS installer here under
stable filenames, then opens a PR so the marketing site can serve them.

| File | Platform |
| --- | --- |
| `phantasmal-linux.AppImage` | Linux |
| `phantasmal-mac.dmg` | macOS |
| `phantasmal-windows.exe` | Windows |

Tracked with Git LFS (see repo root `.gitattributes`).
