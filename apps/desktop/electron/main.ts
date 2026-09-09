import { app, BrowserWindow } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openConfiguredVault, registerVaultIpc, syncNativeThemeFromConfig } from "./ipc";
import { setupAutoUpdater } from "./updater";
import { closeVault } from "./vault/fs-vault";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getPaths() {
	return {
		userData: app.getPath("userData"),
		documents: app.getPath("documents"),
	};
}

function resolveAppIcon(): string | undefined {
	const candidates = [
		path.join(__dirname, "../build/icon.png"),
		path.join(__dirname, "../public/frog-icon.png"),
		path.join(__dirname, "../dist/frog-icon.png"),
	];
	return candidates.find((candidate) => fs.existsSync(candidate));
}

function createWindow() {
	const win = new BrowserWindow({
		width: 1100,
		height: 720,
		minWidth: 900,
		minHeight: 600,
		title: "Phantasmal",
		icon: resolveAppIcon(),
		webPreferences: {
			preload: path.join(__dirname, "preload.mjs"),
			contextIsolation: true,
			nodeIntegration: false,
		},
	});

	if (process.env.VITE_DEV_SERVER_URL) {
		win.loadURL(process.env.VITE_DEV_SERVER_URL);
	} else {
		win.loadFile(path.join(__dirname, "../dist/index.html"));
	}
}

app.whenReady().then(() => {
	registerVaultIpc(getPaths);
	syncNativeThemeFromConfig(getPaths().userData);
	openConfiguredVault(getPaths());
	setupAutoUpdater();
	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("before-quit", () => {
	closeVault();
});
