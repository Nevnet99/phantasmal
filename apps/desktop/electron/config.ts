import fs from "node:fs";
import path from "node:path";
import { localDayKey } from "../src/lib/day";
import {
	isTrackViz,
	isUiDensity,
	isUiTheme,
	type TrackViz,
	type UiDensity,
	type UiTheme,
} from "../src/shared/prefs";
import { isDayKey } from "../src/shared/habits";

export type AppConfig = {
	/** Absolute path to the vault folder (may live in Drive/Dropbox). */
	vaultPath: string | null;
	/** Layout density / corner treatment for the renderer. */
	uiDensity: UiDensity;
	/** Color theme preference for the renderer (and native chrome). */
	uiTheme: UiTheme;
	/** Once-per-day OS notification when habits remain due. */
	dailyReminder: boolean;
	/** Local YYYY-MM-DD of the last due-today notification. */
	lastReminderDay: string | null;
	/** Preferred Track activity visualization. */
	trackViz: TrackViz;
	/** Show a Journal row on the Track habit graph. */
	journalOnGraph: boolean;
	/**
	 * Local YYYY-MM-DD when journal-on-graph tracking started.
	 * Days before this are not marked missed.
	 */
	journalOnGraphSince: string | null;
};

const DEFAULT_CONFIG: AppConfig = {
	vaultPath: null,
	uiDensity: "compact",
	uiTheme: "dark",
	dailyReminder: true,
	lastReminderDay: null,
	trackViz: "graph",
	journalOnGraph: false,
	journalOnGraphSince: null,
};

export function defaultVaultPath(documentsDir: string): string {
	return path.join(documentsDir, "Phantasmal");
}

export function configFilePath(userDataDir: string): string {
	return path.join(userDataDir, "config.json");
}

export function readConfig(userDataDir: string): AppConfig {
	const filePath = configFilePath(userDataDir);
	if (!fs.existsSync(filePath)) {
		return { ...DEFAULT_CONFIG };
	}

	try {
		const raw = fs.readFileSync(filePath, "utf8");
		const parsed = JSON.parse(raw) as Partial<AppConfig>;
		return {
			vaultPath: typeof parsed.vaultPath === "string" ? parsed.vaultPath : null,
			uiDensity: isUiDensity(parsed.uiDensity) ? parsed.uiDensity : DEFAULT_CONFIG.uiDensity,
			uiTheme: isUiTheme(parsed.uiTheme) ? parsed.uiTheme : DEFAULT_CONFIG.uiTheme,
			dailyReminder:
				typeof parsed.dailyReminder === "boolean"
					? parsed.dailyReminder
					: DEFAULT_CONFIG.dailyReminder,
			lastReminderDay: isDayKey(parsed.lastReminderDay) ? parsed.lastReminderDay : null,
			trackViz: isTrackViz(parsed.trackViz) ? parsed.trackViz : DEFAULT_CONFIG.trackViz,
			journalOnGraph:
				typeof parsed.journalOnGraph === "boolean"
					? parsed.journalOnGraph
					: DEFAULT_CONFIG.journalOnGraph,
			journalOnGraphSince: isDayKey(parsed.journalOnGraphSince)
				? parsed.journalOnGraphSince
				: DEFAULT_CONFIG.journalOnGraphSince,
		};
	} catch {
		return { ...DEFAULT_CONFIG };
	}
}

export function writeConfig(userDataDir: string, config: AppConfig): void {
	fs.mkdirSync(userDataDir, { recursive: true });
	fs.writeFileSync(configFilePath(userDataDir), `${JSON.stringify(config, null, "\t")}\n`, "utf8");
}

export function setVaultPath(userDataDir: string, vaultPath: string): AppConfig {
	const next: AppConfig = { ...readConfig(userDataDir), vaultPath };
	writeConfig(userDataDir, next);
	return next;
}

export function setUiDensity(userDataDir: string, uiDensity: UiDensity): AppConfig {
	const next: AppConfig = { ...readConfig(userDataDir), uiDensity };
	writeConfig(userDataDir, next);
	return next;
}

export function setUiTheme(userDataDir: string, uiTheme: UiTheme): AppConfig {
	const next: AppConfig = { ...readConfig(userDataDir), uiTheme };
	writeConfig(userDataDir, next);
	return next;
}

export function setDailyReminder(userDataDir: string, dailyReminder: boolean): AppConfig {
	const next: AppConfig = { ...readConfig(userDataDir), dailyReminder };
	writeConfig(userDataDir, next);
	return next;
}

export function setLastReminderDay(userDataDir: string, lastReminderDay: string | null): AppConfig {
	const next: AppConfig = { ...readConfig(userDataDir), lastReminderDay };
	writeConfig(userDataDir, next);
	return next;
}

export function setTrackViz(userDataDir: string, trackViz: TrackViz): AppConfig {
	const next: AppConfig = { ...readConfig(userDataDir), trackViz };
	writeConfig(userDataDir, next);
	return next;
}

export function setJournalOnGraph(userDataDir: string, journalOnGraph: boolean): AppConfig {
	const current = readConfig(userDataDir);
	const next: AppConfig = {
		...current,
		journalOnGraph,
		journalOnGraphSince: journalOnGraph
			? current.journalOnGraph && current.journalOnGraphSince
				? current.journalOnGraphSince
				: localDayKey()
			: null,
	};
	writeConfig(userDataDir, next);
	return next;
}

/** Stamp a since-day for vaults that enabled journal-on-graph before since was stored. */
export function ensureJournalOnGraphSince(userDataDir: string): AppConfig {
	const current = readConfig(userDataDir);
	if (!current.journalOnGraph || current.journalOnGraphSince) {
		return current;
	}
	const next: AppConfig = { ...current, journalOnGraphSince: localDayKey() };
	writeConfig(userDataDir, next);
	return next;
}
