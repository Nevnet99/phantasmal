import { contextBridge, ipcRenderer } from "electron";
import {
	BREAK_CHANNELS,
	type BreakApi,
	type BreakDraft,
	type BreakSnapshot,
	type BreakView,
} from "../src/shared/break";
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
	IDENTITY_CHANNELS,
	type IdentityApi,
	type IdentityDraft,
	type IdentitySnapshot,
	type IdentityView,
} from "../src/shared/identity";
import {
	JOURNAL_CHANNELS,
	type JournalApi,
	type JournalDraft,
	type JournalEntryView,
	type JournalSnapshot,
	type JournalSummary,
} from "../src/shared/journal";
import {
	REMINDER_CHANNELS,
	SETTINGS_CHANNELS,
	type AppPrefs,
	type RemindersApi,
	type SettingsApi,
	type TrackViz,
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
	setTrackViz: (mode: TrackViz) =>
		ipcRenderer.invoke(SETTINGS_CHANNELS.setTrackViz, mode) as Promise<AppPrefs>,
	setJournalOnGraph: (enabled: boolean) =>
		ipcRenderer.invoke(SETTINGS_CHANNELS.setJournalOnGraph, enabled) as Promise<AppPrefs>,
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
	moveStack: (id: string, direction: "up" | "down", day: DayKey) =>
		ipcRenderer.invoke(HABIT_CHANNELS.moveStack, id, direction, day) as Promise<HabitView>,
	archive: (id: string, note: string, day: DayKey) =>
		ipcRenderer.invoke(HABIT_CHANNELS.archive, id, note, day) as Promise<HabitView>,
	restore: (id: string, day: DayKey) =>
		ipcRenderer.invoke(HABIT_CHANNELS.restore, id, day) as Promise<HabitView>,
	remove: (id: string) => ipcRenderer.invoke(HABIT_CHANNELS.remove, id) as Promise<void>,
};

const identity: IdentityApi = {
	list: () => ipcRenderer.invoke(IDENTITY_CHANNELS.list) as Promise<IdentitySnapshot>,
	listArchived: () => ipcRenderer.invoke(IDENTITY_CHANNELS.listArchived) as Promise<IdentityView[]>,
	create: (draft: IdentityDraft) =>
		ipcRenderer.invoke(IDENTITY_CHANNELS.create, draft) as Promise<IdentityView>,
	update: (id: string, draft: IdentityDraft) =>
		ipcRenderer.invoke(IDENTITY_CHANNELS.update, id, draft) as Promise<IdentityView>,
	archive: (id: string, note: string) =>
		ipcRenderer.invoke(IDENTITY_CHANNELS.archive, id, note) as Promise<IdentityView>,
	restore: (id: string) =>
		ipcRenderer.invoke(IDENTITY_CHANNELS.restore, id) as Promise<IdentityView>,
	remove: (id: string) => ipcRenderer.invoke(IDENTITY_CHANNELS.remove, id) as Promise<void>,
};

const breaks: BreakApi = {
	list: (day?: string) => ipcRenderer.invoke(BREAK_CHANNELS.list, day) as Promise<BreakSnapshot>,
	listArchived: () => ipcRenderer.invoke(BREAK_CHANNELS.listArchived) as Promise<BreakView[]>,
	create: (draft: BreakDraft, day: string) =>
		ipcRenderer.invoke(BREAK_CHANNELS.create, draft, day) as Promise<BreakView>,
	update: (id: string, draft: BreakDraft, day: string) =>
		ipcRenderer.invoke(BREAK_CHANNELS.update, id, draft, day) as Promise<BreakView>,
	toggleCleanDay: (id: string, day: string) =>
		ipcRenderer.invoke(BREAK_CHANNELS.toggleCleanDay, id, day) as Promise<BreakView>,
	archive: (id: string, note: string, day: string) =>
		ipcRenderer.invoke(BREAK_CHANNELS.archive, id, note, day) as Promise<BreakView>,
	restore: (id: string, day: string) =>
		ipcRenderer.invoke(BREAK_CHANNELS.restore, id, day) as Promise<BreakView>,
	remove: (id: string) => ipcRenderer.invoke(BREAK_CHANNELS.remove, id) as Promise<void>,
};

const journal: JournalApi = {
	get: (query) => ipcRenderer.invoke(JOURNAL_CHANNELS.get, query) as Promise<JournalSnapshot>,
	list: () => ipcRenderer.invoke(JOURNAL_CHANNELS.list) as Promise<JournalSummary[]>,
	save: (draft: JournalDraft) =>
		ipcRenderer.invoke(JOURNAL_CHANNELS.save, draft) as Promise<JournalEntryView>,
	remove: (id: string) => ipcRenderer.invoke(JOURNAL_CHANNELS.remove, id) as Promise<void>,
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
	identity,
	breaks,
	journal,
	reminders,
});
