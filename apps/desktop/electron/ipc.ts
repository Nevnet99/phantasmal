import { BrowserWindow, dialog, ipcMain, nativeTheme, shell } from "electron";
import {
	defaultVaultPath,
	ensureJournalOnGraphSince,
	readConfig,
	setDailyReminder,
	setJournalOnGraph,
	setTrackViz,
	setUiDensity,
	setUiTheme,
	setVaultPath,
} from "./config";
import { buildAppAbout } from "./about";
import { checkForUpdates, downloadUpdate, getUpdateStatus, installUpdate } from "./updater";
import { APP_CHANNELS, isAllowedExternalUrl } from "../src/shared/app";
import { closeVault, getOpenVault, looksLikeVault, openVaultAt } from "./vault/fs-vault";
import {
	archiveHabit,
	createHabit,
	getTrackSnapshot,
	listArchivedHabits,
	listHabits,
	removeHabit,
	restoreHabit,
	toggleHabitDay,
	moveStackHabit,
	updateHabit,
} from "./vault/habits";
import { syncDueTodayReminder } from "./reminders";
import {
	archiveIdentity,
	createIdentity,
	listArchivedIdentities,
	listIdentities,
	removeIdentity,
	restoreIdentity,
	updateIdentity,
} from "./vault/identity";
import {
	archiveBreak,
	createBreak,
	listArchivedBreaks,
	listBreaks,
	removeBreak,
	restoreBreak,
	toggleBreakCleanDay,
	updateBreak,
} from "./vault/breaks";
import {
	getJournal,
	listJournalSummaries,
	removeJournal,
	saveJournal,
	unlinkHabitFromJournals,
} from "./vault/journal";
import {
	REMINDER_CHANNELS,
	SETTINGS_CHANNELS,
	isTrackViz,
	isUiDensity,
	isUiTheme,
	type AppPrefs,
	type UiTheme,
} from "../src/shared/prefs";
import { HABIT_CHANNELS, isDayKey, isTrackQuery, type HabitDraft } from "../src/shared/habits";
import { BREAK_CHANNELS, isBreakDraft } from "../src/shared/break";
import { IDENTITY_CHANNELS, isIdentityDraft } from "../src/shared/identity";
import { JOURNAL_CHANNELS, isJournalDraft, isJournalGetQuery } from "../src/shared/journal";
import { VAULT_CHANNELS, type VaultStatus } from "../src/shared/vault";

type Paths = {
	userData: string;
	documents: string;
};

function applyNativeTheme(theme: UiTheme): void {
	nativeTheme.themeSource = theme;
}

function prefsFromConfig(userDataDir: string): AppPrefs {
	const config = ensureJournalOnGraphSince(userDataDir);
	return {
		uiDensity: config.uiDensity,
		uiTheme: config.uiTheme,
		dailyReminder: config.dailyReminder,
		trackViz: config.trackViz,
		journalOnGraph: config.journalOnGraph,
		journalOnGraphSince: config.journalOnGraphSince,
	};
}

export function syncNativeThemeFromConfig(userDataDir: string): void {
	applyNativeTheme(readConfig(userDataDir).uiTheme);
}

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

	ipcMain.handle(SETTINGS_CHANNELS.getPrefs, () => prefsFromConfig(getPaths().userData));

	ipcMain.handle(SETTINGS_CHANNELS.setUiDensity, (_event, density: unknown) => {
		if (!isUiDensity(density)) {
			return prefsFromConfig(getPaths().userData);
		}
		setUiDensity(getPaths().userData, density);
		return prefsFromConfig(getPaths().userData);
	});

	ipcMain.handle(SETTINGS_CHANNELS.setUiTheme, (_event, theme: unknown) => {
		if (!isUiTheme(theme)) {
			return prefsFromConfig(getPaths().userData);
		}
		const config = setUiTheme(getPaths().userData, theme);
		applyNativeTheme(config.uiTheme);
		return prefsFromConfig(getPaths().userData);
	});

	ipcMain.handle(SETTINGS_CHANNELS.setDailyReminder, (_event, enabled: unknown) => {
		if (typeof enabled !== "boolean") {
			return prefsFromConfig(getPaths().userData);
		}
		setDailyReminder(getPaths().userData, enabled);
		return prefsFromConfig(getPaths().userData);
	});

	ipcMain.handle(SETTINGS_CHANNELS.setTrackViz, (_event, mode: unknown) => {
		if (!isTrackViz(mode)) {
			return prefsFromConfig(getPaths().userData);
		}
		setTrackViz(getPaths().userData, mode);
		return prefsFromConfig(getPaths().userData);
	});

	ipcMain.handle(SETTINGS_CHANNELS.setJournalOnGraph, (_event, enabled: unknown) => {
		if (typeof enabled !== "boolean") {
			return prefsFromConfig(getPaths().userData);
		}
		setJournalOnGraph(getPaths().userData, enabled);
		return prefsFromConfig(getPaths().userData);
	});

	ipcMain.handle(REMINDER_CHANNELS.syncDueToday, (_event, remaining: unknown, today: unknown) => {
		if (typeof remaining !== "number" || !isDayKey(today)) {
			return;
		}
		syncDueTodayReminder(getPaths().userData, remaining, today);
	});

	ipcMain.handle(HABIT_CHANNELS.list, (_event, today: unknown) => {
		if (!isDayKey(today)) {
			throw new Error("Invalid day.");
		}
		return listHabits(today);
	});

	ipcMain.handle(HABIT_CHANNELS.listArchived, () => listArchivedHabits());

	ipcMain.handle(HABIT_CHANNELS.getTrack, (_event, query: unknown) => {
		if (!isTrackQuery(query)) {
			throw new Error("Invalid track query.");
		}
		const config = ensureJournalOnGraphSince(getPaths().userData);
		return getTrackSnapshot({
			...query,
			includeJournalGraph: Boolean(query.includeJournalGraph && config.journalOnGraph),
			journalGraphSince: config.journalOnGraph ? config.journalOnGraphSince : null,
		});
	});

	ipcMain.handle(HABIT_CHANNELS.create, (_event, draft: unknown, today: unknown) => {
		if (!isDayKey(today) || !draft || typeof draft !== "object") {
			throw new Error("Invalid habit draft.");
		}
		const record = draft as HabitDraft;
		if (typeof record.name !== "string") {
			throw new Error("Invalid habit draft.");
		}
		return createHabit(
			{
				name: record.name,
				cue: typeof record.cue === "string" ? record.cue : "",
				note: typeof record.note === "string" ? record.note : "",
				color: typeof record.color === "string" ? record.color : undefined,
				schedule: record.schedule,
				stackAfterId: record.stackAfterId,
			},
			today,
		);
	});

	ipcMain.handle(HABIT_CHANNELS.update, (_event, id: unknown, draft: unknown, today: unknown) => {
		if (typeof id !== "string" || !isDayKey(today) || !draft || typeof draft !== "object") {
			throw new Error("Invalid habit update.");
		}
		const record = draft as HabitDraft;
		if (typeof record.name !== "string") {
			throw new Error("Invalid habit update.");
		}
		return updateHabit(
			id,
			{
				name: record.name,
				cue: typeof record.cue === "string" ? record.cue : "",
				note: typeof record.note === "string" ? record.note : "",
				color: typeof record.color === "string" ? record.color : undefined,
				schedule: record.schedule,
				stackAfterId: record.stackAfterId,
			},
			today,
		);
	});

	ipcMain.handle(HABIT_CHANNELS.toggleDay, (_event, id: unknown, today: unknown) => {
		if (typeof id !== "string" || !isDayKey(today)) {
			throw new Error("Invalid toggle request.");
		}
		return toggleHabitDay(id, today);
	});

	ipcMain.handle(
		HABIT_CHANNELS.moveStack,
		(_event, id: unknown, direction: unknown, today: unknown) => {
			if (
				typeof id !== "string" ||
				(direction !== "up" && direction !== "down") ||
				!isDayKey(today)
			) {
				throw new Error("Invalid stack move request.");
			}
			return moveStackHabit(id, direction, today);
		},
	);

	ipcMain.handle(HABIT_CHANNELS.archive, (_event, id: unknown, note: unknown, today: unknown) => {
		if (typeof id !== "string" || typeof note !== "string" || !isDayKey(today)) {
			throw new Error("Invalid archive request.");
		}
		return archiveHabit(id, note, today);
	});

	ipcMain.handle(HABIT_CHANNELS.restore, (_event, id: unknown, today: unknown) => {
		if (typeof id !== "string" || !isDayKey(today)) {
			throw new Error("Invalid restore request.");
		}
		return restoreHabit(id, today);
	});

	ipcMain.handle(HABIT_CHANNELS.remove, (_event, id: unknown) => {
		if (typeof id !== "string") {
			throw new Error("Invalid remove request.");
		}
		const removed = removeHabit(id);
		unlinkHabitFromJournals(removed.id, removed.tag);
	});

	ipcMain.handle(IDENTITY_CHANNELS.list, () => listIdentities());

	ipcMain.handle(IDENTITY_CHANNELS.listArchived, () => listArchivedIdentities());

	ipcMain.handle(IDENTITY_CHANNELS.create, (_event, draft: unknown) => {
		if (!isIdentityDraft(draft)) {
			throw new Error("Invalid identity draft.");
		}
		return createIdentity({
			statement: draft.statement,
			note: draft.note ?? "",
			habitIds: draft.habitIds ?? [],
		});
	});

	ipcMain.handle(IDENTITY_CHANNELS.update, (_event, id: unknown, draft: unknown) => {
		if (typeof id !== "string" || !isIdentityDraft(draft)) {
			throw new Error("Invalid identity update.");
		}
		return updateIdentity(id, {
			statement: draft.statement,
			note: draft.note ?? "",
			habitIds: draft.habitIds ?? [],
		});
	});

	ipcMain.handle(IDENTITY_CHANNELS.archive, (_event, id: unknown, note: unknown) => {
		if (typeof id !== "string" || typeof note !== "string") {
			throw new Error("Invalid archive request.");
		}
		return archiveIdentity(id, note);
	});

	ipcMain.handle(IDENTITY_CHANNELS.restore, (_event, id: unknown) => {
		if (typeof id !== "string") {
			throw new Error("Invalid restore request.");
		}
		return restoreIdentity(id);
	});

	ipcMain.handle(IDENTITY_CHANNELS.remove, (_event, id: unknown) => {
		if (typeof id !== "string") {
			throw new Error("Invalid remove request.");
		}
		removeIdentity(id);
	});

	ipcMain.handle(BREAK_CHANNELS.list, (_event, day: unknown) => {
		if (day !== undefined && !isDayKey(day)) {
			throw new Error("Invalid day.");
		}
		return listBreaks(typeof day === "string" ? day : undefined);
	});

	ipcMain.handle(BREAK_CHANNELS.listArchived, () => listArchivedBreaks());

	ipcMain.handle(BREAK_CHANNELS.create, (_event, draft: unknown, day: unknown) => {
		if (!isBreakDraft(draft) || !isDayKey(day)) {
			throw new Error("Invalid break draft.");
		}
		return createBreak(draft, day);
	});

	ipcMain.handle(BREAK_CHANNELS.update, (_event, id: unknown, draft: unknown, day: unknown) => {
		if (typeof id !== "string" || !isBreakDraft(draft) || !isDayKey(day)) {
			throw new Error("Invalid break update.");
		}
		return updateBreak(id, draft, day);
	});

	ipcMain.handle(BREAK_CHANNELS.toggleCleanDay, (_event, id: unknown, day: unknown) => {
		if (typeof id !== "string" || !isDayKey(day)) {
			throw new Error("Invalid clean-day toggle.");
		}
		return toggleBreakCleanDay(id, day);
	});

	ipcMain.handle(BREAK_CHANNELS.archive, (_event, id: unknown, note: unknown, day: unknown) => {
		if (typeof id !== "string" || typeof note !== "string" || !isDayKey(day)) {
			throw new Error("Invalid archive request.");
		}
		return archiveBreak(id, note, day);
	});

	ipcMain.handle(BREAK_CHANNELS.restore, (_event, id: unknown, day: unknown) => {
		if (typeof id !== "string" || !isDayKey(day)) {
			throw new Error("Invalid restore request.");
		}
		return restoreBreak(id, day);
	});

	ipcMain.handle(BREAK_CHANNELS.remove, (_event, id: unknown) => {
		if (typeof id !== "string") {
			throw new Error("Invalid remove request.");
		}
		const removed = removeBreak(id);
		unlinkHabitFromJournals(removed.id, removed.tag);
	});

	ipcMain.handle(JOURNAL_CHANNELS.get, (_event, query: unknown) => {
		if (!isJournalGetQuery(query)) {
			throw new Error("Invalid journal day.");
		}
		return getJournal(query);
	});

	ipcMain.handle(JOURNAL_CHANNELS.list, () => listJournalSummaries());

	ipcMain.handle(JOURNAL_CHANNELS.save, (_event, draft: unknown) => {
		if (!isJournalDraft(draft)) {
			throw new Error("Invalid journal draft.");
		}
		return saveJournal({
			day: draft.day,
			id: draft.id,
			mood: draft.mood === undefined ? undefined : draft.mood,
			title: draft.title,
			body: draft.body,
			habitIds: draft.habitIds,
		});
	});

	ipcMain.handle(JOURNAL_CHANNELS.remove, (_event, id: unknown) => {
		if (typeof id !== "string" || !id) {
			throw new Error("Invalid journal entry.");
		}
		removeJournal(id);
	});

	ipcMain.handle(APP_CHANNELS.getAbout, () => buildAppAbout());

	ipcMain.handle(APP_CHANNELS.openExternal, async (_event, url: unknown) => {
		if (typeof url !== "string" || !isAllowedExternalUrl(url)) {
			throw new Error("Invalid link.");
		}
		await shell.openExternal(url);
	});

	ipcMain.handle(APP_CHANNELS.getUpdateStatus, () => getUpdateStatus());

	ipcMain.handle(APP_CHANNELS.checkForUpdates, () => checkForUpdates());

	ipcMain.handle(APP_CHANNELS.downloadUpdate, () => downloadUpdate());

	ipcMain.handle(APP_CHANNELS.installUpdate, () => {
		installUpdate();
	});
}
