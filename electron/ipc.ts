import { BrowserWindow, dialog, ipcMain, shell } from "electron";
import { defaultVaultPath, readConfig, setVaultPath } from "./config";
import { closeVault, getOpenVault, looksLikeVault, openVaultAt } from "./vault/fs-vault";
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

async function pickDirectory(title: string, message: string): Promise<string | null> {
	const win = parentWindow();
	const options = {
		title,
		properties: ["openDirectory", "createDirectory"] as Array<"openDirectory" | "createDirectory">,
		message,
	};
	const result = win
		? await dialog.showOpenDialog(win, options)
		: await dialog.showOpenDialog(options);

	if (result.canceled || result.filePaths.length === 0) {
		return null;
	}
	return result.filePaths[0];
}

export function registerVaultIpc(getPaths: () => Paths): void {
	ipcMain.handle(VAULT_CHANNELS.getStatus, () => getVaultStatus(getPaths()));

	ipcMain.handle(VAULT_CHANNELS.useDefaultLocation, () => {
		const paths = getPaths();
		return assignAndOpen(paths, defaultVaultPath(paths.documents));
	});

	ipcMain.handle(VAULT_CHANNELS.chooseFolder, async () => {
		const paths = getPaths();
		const folder = await pickDirectory(
			"Choose vault folder",
			"Phantasmal will create a file vault here (safe to put in Google Drive or Dropbox).",
		);
		if (!folder) {
			return getVaultStatus(paths);
		}
		return assignAndOpen(paths, folder);
	});

	ipcMain.handle(VAULT_CHANNELS.openExistingVault, async () => {
		const paths = getPaths();
		const folder = await pickDirectory(
			"Open existing vault",
			"Pick a folder that already contains phantasmal.json.",
		);
		if (!folder) {
			return getVaultStatus(paths);
		}
		if (!looksLikeVault(folder)) {
			return {
				...getVaultStatus(paths),
				error: "That folder is not a Phantasmal vault (missing phantasmal.json).",
			};
		}
		return assignAndOpen(paths, folder);
	});

	ipcMain.handle(VAULT_CHANNELS.revealInFolder, async () => {
		const paths = getPaths();
		const config = readConfig(paths.userData);
		if (!config.vaultPath) {
			return false;
		}
		await shell.openPath(config.vaultPath);
		return true;
	});
}
