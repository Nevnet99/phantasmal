/** Packaged-app updates via electron-updater + GitHub Releases. */

import { app, BrowserWindow } from "electron";
import electronUpdater from "electron-updater";
import type { AppUpdateStatus } from "../src/shared/app";
import { readAppVersion } from "./about";

const { autoUpdater } = electronUpdater;

let status: AppUpdateStatus = {
	packaged: false,
	currentVersion: readAppVersion(),
	state: "idle",
	availableVersion: "",
	progress: 0,
	summary: "Updates are checked from GitHub Releases in packaged builds.",
	error: "",
};

function broadcast(): void {
	for (const win of BrowserWindow.getAllWindows()) {
		win.webContents.send("app:updateStatus", status);
	}
}

function setStatus(partial: Partial<AppUpdateStatus>): AppUpdateStatus {
	status = { ...status, ...partial };
	broadcast();
	return status;
}

export function getUpdateStatus(): AppUpdateStatus {
	return status;
}

export function setupAutoUpdater(): void {
	status.packaged = app.isPackaged;
	status.currentVersion = app.isPackaged ? app.getVersion() : readAppVersion();

	if (!app.isPackaged) {
		status.summary =
			"You're running a development build. Package with bun run dist, publish a GitHub Release, then Check for updates works for people who download the app.";
		return;
	}

	autoUpdater.autoDownload = false;
	autoUpdater.autoInstallOnAppQuit = true;

	autoUpdater.on("checking-for-update", () => {
		setStatus({
			state: "checking",
			error: "",
			summary: "Checking GitHub Releases for a newer build…",
		});
	});

	autoUpdater.on("update-available", (info) => {
		setStatus({
			state: "available",
			availableVersion: info.version,
			error: "",
			summary: `Version ${info.version} is available. Download it, then restart to install.`,
		});
	});

	autoUpdater.on("update-not-available", () => {
		setStatus({
			state: "not-available",
			availableVersion: "",
			error: "",
			summary: `You're on the latest release (${status.currentVersion}).`,
		});
	});

	autoUpdater.on("download-progress", (progress) => {
		const percent = Math.round(progress.percent);
		setStatus({
			state: "downloading",
			progress: percent,
			summary: `Downloading update… ${percent}%`,
			error: "",
		});
	});

	autoUpdater.on("update-downloaded", (info) => {
		setStatus({
			state: "downloaded",
			availableVersion: info.version,
			progress: 100,
			error: "",
			summary: `Version ${info.version} is ready. Restart to finish installing.`,
		});
	});

	autoUpdater.on("error", (error) => {
		const message = error instanceof Error ? error.message : String(error);
		setStatus({
			state: "error",
			error: message,
			summary: "Could not check for or download updates.",
		});
	});

	status.summary = `Installed version ${status.currentVersion}. Check for updates anytime.`;
}

export async function checkForUpdates(): Promise<AppUpdateStatus> {
	if (!app.isPackaged) {
		return setStatus({
			state: "idle",
			summary:
				"Auto-update only runs in packaged apps. Build with bun run dist and publish a release for downloaders.",
		});
	}

	try {
		await autoUpdater.checkForUpdates();
		return status;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return setStatus({
			state: "error",
			error: message,
			summary: "Could not check for updates.",
		});
	}
}

export async function downloadUpdate(): Promise<AppUpdateStatus> {
	if (!app.isPackaged) {
		return setStatus({
			state: "error",
			error: "Not a packaged build.",
			summary: "Download updates from a packaged install.",
		});
	}
	if (status.state !== "available" && status.state !== "error") {
		return status;
	}

	try {
		setStatus({
			state: "downloading",
			progress: 0,
			error: "",
			summary: "Downloading update…",
		});
		await autoUpdater.downloadUpdate();
		return status;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return setStatus({
			state: "error",
			error: message,
			summary: "Download failed.",
		});
	}
}

export function installUpdate(): void {
	if (!app.isPackaged || status.state !== "downloaded") return;
	autoUpdater.quitAndInstall();
}
