import { contextBridge, ipcRenderer } from "electron";
import {
	HABIT_CHANNELS,
	type DayKey,
	type HabitDraft,
	type HabitsApi,
	type HabitView,
	type TrackQuery,
	type TrackSnapshot,
} from "../src/shared/habits";
import {
	REMINDER_CHANNELS,
	SETTINGS_CHANNELS,
	type AppPrefs,
	type RemindersApi,
	type SettingsApi,
	type UiDensity,
	type UiTheme,
} from "../src/shared/prefs";
import { VAULT_CHANNELS, type VaultApi, type VaultStatus } from "../src/shared/vault";

const vault: VaultApi = {
	getStatus: () => ipcRenderer.invoke(VAULT_CHANNELS.getStatus) as Promise<VaultStatus>,
	chooseFolder: () => ipcRenderer.invoke(VAULT_CHANNELS.chooseFolder) as Promise<VaultStatus>,
	openExistingVault: () =>
		ipcRenderer.invoke(VAULT_CHANNELS.openExistingVault) as Promise<VaultStatus>,
	useDefaultLocation: () =>
		ipcRenderer.invoke(VAULT_CHANNELS.useDefaultLocation) as Promise<VaultStatus>,
	revealInFolder: () => ipcRenderer.invoke(VAULT_CHANNELS.revealInFolder) as Promise<boolean>,
};

const settings: SettingsApi = {
	getPrefs: () => ipcRenderer.invoke(SETTINGS_CHANNELS.getPrefs) as Promise<AppPrefs>,
	setUiDensity: (density: UiDensity) =>
		ipcRenderer.invoke(SETTINGS_CHANNELS.setUiDensity, density) as Promise<AppPrefs>,
	setUiTheme: (theme: UiTheme) =>
		ipcRenderer.invoke(SETTINGS_CHANNELS.setUiTheme, theme) as Promise<AppPrefs>,
	setDailyReminder: (enabled: boolean) =>
		ipcRenderer.invoke(SETTINGS_CHANNELS.setDailyReminder, enabled) as Promise<AppPrefs>,
};

const habits: HabitsApi = {
	list: (day: DayKey) => ipcRenderer.invoke(HABIT_CHANNELS.list, day) as Promise<HabitView[]>,
	listArchived: () => ipcRenderer.invoke(HABIT_CHANNELS.listArchived) as Promise<HabitView[]>,
	getTrack: (query: TrackQuery) =>
		ipcRenderer.invoke(HABIT_CHANNELS.getTrack, query) as Promise<TrackSnapshot>,
	create: (draft: HabitDraft, day: DayKey) =>
		ipcRenderer.invoke(HABIT_CHANNELS.create, draft, day) as Promise<HabitView>,
	update: (id: string, draft: HabitDraft, day: DayKey) =>
		ipcRenderer.invoke(HABIT_CHANNELS.update, id, draft, day) as Promise<HabitView>,
	toggleDay: (id: string, day: DayKey) =>
		ipcRenderer.invoke(HABIT_CHANNELS.toggleDay, id, day) as Promise<HabitView>,
	archive: (id: string, note: string, day: DayKey) =>
		ipcRenderer.invoke(HABIT_CHANNELS.archive, id, note, day) as Promise<HabitView>,
	restore: (id: string, day: DayKey) =>
		ipcRenderer.invoke(HABIT_CHANNELS.restore, id, day) as Promise<HabitView>,
	remove: (id: string) => ipcRenderer.invoke(HABIT_CHANNELS.remove, id) as Promise<void>,
};

const reminders: RemindersApi = {
	syncDueToday: (remaining: number, today: string) =>
		ipcRenderer.invoke(REMINDER_CHANNELS.syncDueToday, remaining, today) as Promise<void>,
};

contextBridge.exposeInMainWorld("phantasmal", {
	platform: process.platform,
	vault,
	settings,
	habits,
	reminders,
});
