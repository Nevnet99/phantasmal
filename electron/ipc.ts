import { BrowserWindow, dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { defaultVaultPath, readConfig, setVaultPath } from "./config";
import { closeVault, getOpenVault, openVaultAt } from "./db/vault";
import { VAULT_CHANNELS, type VaultStatus } from "../src/shared/vault";

type Paths = {
	userData: string;
	documents: string;
};

function statusFromError(paths: Paths, error: unknown): VaultStatus {
	const config = readConfig(paths.userData);
	return {
		configured: Boolean(config.vaultPath),
		path: config.vaultPath,
		open: false,
		schemaVersion: null,
		defaultPath: defaultVaultPath(paths.documents),
		error: error instanceof Error ? error.message : String(error),
	};
}

export function getVaultStatus(paths: Paths): VaultStatus {
	const config = readConfig(paths.userData);
	const vault = getOpenVault();
	const defaultPath = defaultVaultPath(paths.documents);

	if (!config.vaultPath) {
		return {
			configured: false,
			path: null,
			open: false,
			schemaVersion: null,
			defaultPath,
			error: null,
		};
	}

	if (vault && vault.path === config.vaultPath) {
		return {
			configured: true,
			path: vault.path,
			open: true,
			schemaVersion: vault.schemaVersion,
			defaultPath,
			error: null,
		};
	}

	return {
		configured: true,
		path: config.vaultPath,
		open: false,
		schemaVersion: null,
		defaultPath,
		error: "Vault is configured but not open.",
	};
}

export function openConfiguredVault(paths: Paths): VaultStatus {
	const config = readConfig(paths.userData);
	if (!config.vaultPath) {
		return getVaultStatus(paths);
	}

	try {
		openVaultAt(config.vaultPath);
		return getVaultStatus(paths);
	} catch (error) {
		closeVault();
		return statusFromError(paths, error);
	}
}

function assignAndOpen(paths: Paths, vaultPath: string): VaultStatus {
	setVaultPath(paths.userData, vaultPath);
	try {
		openVaultAt(vaultPath);
		return getVaultStatus(paths);
	} catch (error) {
		closeVault();
		return statusFromError(paths, error);
	}
}

function parentWindow(): BrowserWindow | null {
	return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null;
}

export function registerVaultIpc(getPaths: () => Paths): void {
	ipcMain.handle(VAULT_CHANNELS.getStatus, () => getVaultStatus(getPaths()));

	ipcMain.handle(VAULT_CHANNELS.useDefaultLocation, () => {
		const paths = getPaths();
		return assignAndOpen(paths, defaultVaultPath(paths.documents));
	});

	ipcMain.handle(VAULT_CHANNELS.chooseFolder, async () => {
		const paths = getPaths();
		const win = parentWindow();
		const result = win
			? await dialog.showOpenDialog(win, {
					title: "Choose vault folder",
					properties: ["openDirectory", "createDirectory"],
					message: "Phantasmal will create or open phantasmal.db in this folder.",
				})
			: await dialog.showOpenDialog({
					title: "Choose vault folder",
					properties: ["openDirectory", "createDirectory"],
					message: "Phantasmal will create or open phantasmal.db in this folder.",
				});

		if (result.canceled || result.filePaths.length === 0) {
			return getVaultStatus(paths);
		}

		const vaultPath = path.join(result.filePaths[0], "phantasmal.db");
		return assignAndOpen(paths, vaultPath);
	});

	ipcMain.handle(VAULT_CHANNELS.openDatabaseFile, async () => {
		const paths = getPaths();
		const win = parentWindow();
		const result = win
			? await dialog.showOpenDialog(win, {
					title: "Open existing vault",
					properties: ["openFile"],
					filters: [{ name: "Phantasmal database", extensions: ["db"] }],
				})
			: await dialog.showOpenDialog({
					title: "Open existing vault",
					properties: ["openFile"],
					filters: [{ name: "Phantasmal database", extensions: ["db"] }],
				});

		if (result.canceled || result.filePaths.length === 0) {
			return getVaultStatus(paths);
		}

		return assignAndOpen(paths, result.filePaths[0]);
	});

	ipcMain.handle(VAULT_CHANNELS.revealInFolder, async () => {
		const paths = getPaths();
		const config = readConfig(paths.userData);
		if (!config.vaultPath) {
			return false;
		}
		shell.showItemInFolder(config.vaultPath);
		return true;
	});
}
