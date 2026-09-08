import fs from "node:fs";
import path from "node:path";
import { isUiDensity, isUiTheme, type UiDensity, type UiTheme } from "../src/shared/prefs";
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
};

const DEFAULT_CONFIG: AppConfig = {
	vaultPath: null,
	uiDensity: "compact",
	uiTheme: "dark",
	dailyReminder: true,
	lastReminderDay: null,
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
