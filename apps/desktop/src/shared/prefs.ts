export type UiDensity = "compact" | "comfortable" | "roomy";
export type UiTheme = "system" | "light" | "dark";
export type TrackViz = "graph" | "calendar";

export const UI_DENSITIES: UiDensity[] = ["compact", "comfortable", "roomy"];
export const UI_THEMES: UiTheme[] = ["system", "light", "dark"];
export const TRACK_VIZ_OPTIONS: TrackViz[] = ["graph", "calendar"];

export function isUiDensity(value: unknown): value is UiDensity {
	return value === "compact" || value === "comfortable" || value === "roomy";
}

export function isUiTheme(value: unknown): value is UiTheme {
	return value === "system" || value === "light" || value === "dark";
}

export function isTrackViz(value: unknown): value is TrackViz {
	return value === "graph" || value === "calendar";
}

export const SETTINGS_CHANNELS = {
	getPrefs: "settings:getPrefs",
	setUiDensity: "settings:setUiDensity",
	setUiTheme: "settings:setUiTheme",
	setDailyReminder: "settings:setDailyReminder",
	setTrackViz: "settings:setTrackViz",
	setJournalOnGraph: "settings:setJournalOnGraph",
} as const;

export const REMINDER_CHANNELS = {
	syncDueToday: "reminders:syncDueToday",
} as const;

export type AppPrefs = {
	uiDensity: UiDensity;
	uiTheme: UiTheme;
	/** OS notification once per day when habits remain due. */
	dailyReminder: boolean;
	/** Preferred Track activity visualization. */
	trackViz: TrackViz;
	/** Show a Journal row on the Track graph. */
	journalOnGraph: boolean;
	/** Local day journal-on-graph tracking started (null when off). */
	journalOnGraphSince: string | null;
};

export type SettingsApi = {
	getPrefs: () => Promise<AppPrefs>;
	setUiDensity: (density: UiDensity) => Promise<AppPrefs>;
	setUiTheme: (theme: UiTheme) => Promise<AppPrefs>;
	setDailyReminder: (enabled: boolean) => Promise<AppPrefs>;
	setTrackViz: (mode: TrackViz) => Promise<AppPrefs>;
	setJournalOnGraph: (enabled: boolean) => Promise<AppPrefs>;
};

export type RemindersApi = {
	syncDueToday: (remaining: number, today: string) => Promise<void>;
};
