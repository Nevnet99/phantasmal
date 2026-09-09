import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	configFilePath,
	defaultVaultPath,
	ensureJournalOnGraphSince,
	readConfig,
	setDailyReminder,
	setJournalOnGraph,
	setTrackViz,
	setUiDensity,
	setUiTheme,
	setVaultPath,
	writeConfig,
} from "./config";

const tempDirs: string[] = [];

afterEach(() => {
	for (const dir of tempDirs.splice(0)) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

function tempDir(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "phantasmal-config-"));
	tempDirs.push(dir);
	return dir;
}

describe("config", () => {
	it("defaults vaultPath, compact density, dark theme, and reminders when missing", () => {
		expect(readConfig(tempDir())).toEqual({
			vaultPath: null,
			uiDensity: "compact",
			uiTheme: "dark",
			dailyReminder: true,
			lastReminderDay: null,
			trackViz: "graph",
			journalOnGraph: false,
			journalOnGraphSince: null,
		});
	});

	it("persists a vault folder path without clearing prefs", () => {
		const userData = tempDir();
		setUiDensity(userData, "roomy");
		setUiTheme(userData, "light");
		setDailyReminder(userData, false);
		setTrackViz(userData, "calendar");
		setJournalOnGraph(userData, true);
		const vaultPath = "/home/luke/Google Drive/Phantasmal";
		setVaultPath(userData, vaultPath);

		expect(fs.existsSync(configFilePath(userData))).toBe(true);
		const config = readConfig(userData);
		expect(config.vaultPath).toBe(vaultPath);
		expect(config.uiDensity).toBe("roomy");
		expect(config.uiTheme).toBe("light");
		expect(config.dailyReminder).toBe(false);
		expect(config.lastReminderDay).toBe(null);
		expect(config.trackViz).toBe("calendar");
		expect(config.journalOnGraph).toBe(true);
		expect(config.journalOnGraphSince).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it("persists ui density", () => {
		const userData = tempDir();
		setUiDensity(userData, "comfortable");
		expect(readConfig(userData).uiDensity).toBe("comfortable");
	});

	it("persists ui theme", () => {
		const userData = tempDir();
		setUiTheme(userData, "system");
		expect(readConfig(userData).uiTheme).toBe("system");
	});

	it("persists daily reminder preference", () => {
		const userData = tempDir();
		setDailyReminder(userData, false);
		expect(readConfig(userData).dailyReminder).toBe(false);
	});

	it("persists track visualization preference", () => {
		const userData = tempDir();
		setTrackViz(userData, "calendar");
		expect(readConfig(userData).trackViz).toBe("calendar");
	});

	it("persists journal-on-graph preference", () => {
		const userData = tempDir();
		setJournalOnGraph(userData, true);
		const enabled = readConfig(userData);
		expect(enabled.journalOnGraph).toBe(true);
		expect(enabled.journalOnGraphSince).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		const since = enabled.journalOnGraphSince;

		setJournalOnGraph(userData, true);
		expect(readConfig(userData).journalOnGraphSince).toBe(since);

		setJournalOnGraph(userData, false);
		expect(readConfig(userData)).toMatchObject({
			journalOnGraph: false,
			journalOnGraphSince: null,
		});
	});

	it("stamps journal-on-graph since for legacy enabled configs", () => {
		const userData = tempDir();
		writeConfig(userData, {
			vaultPath: null,
			uiDensity: "compact",
			uiTheme: "dark",
			dailyReminder: true,
			lastReminderDay: null,
			trackViz: "graph",
			journalOnGraph: true,
			journalOnGraphSince: null,
		});
		const migrated = ensureJournalOnGraphSince(userData);
		expect(migrated.journalOnGraph).toBe(true);
		expect(migrated.journalOnGraphSince).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it("builds the Documents/Phantasmal default folder", () => {
		expect(defaultVaultPath("/home/luke/Documents")).toBe(
			path.join("/home/luke/Documents", "Phantasmal"),
		);
	});

	it("recovers from corrupt config JSON", () => {
		const userData = tempDir();
		writeConfig(userData, {
			vaultPath: null,
			uiDensity: "compact",
			uiTheme: "dark",
			dailyReminder: true,
			lastReminderDay: null,
			trackViz: "graph",
			journalOnGraph: false,
			journalOnGraphSince: null,
		});
		fs.writeFileSync(configFilePath(userData), "{not-json", "utf8");
		expect(readConfig(userData)).toEqual({
			vaultPath: null,
			uiDensity: "compact",
			uiTheme: "dark",
			dailyReminder: true,
			lastReminderDay: null,
			trackViz: "graph",
			journalOnGraph: false,
			journalOnGraphSince: null,
		});
	});
});
