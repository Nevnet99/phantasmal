import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	configFilePath,
	defaultVaultPath,
	readConfig,
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
	it("defaults vaultPath, compact density, and dark theme when missing", () => {
		expect(readConfig(tempDir())).toEqual({
			vaultPath: null,
			uiDensity: "compact",
			uiTheme: "dark",
		});
	});

	it("persists a vault folder path without clearing prefs", () => {
		const userData = tempDir();
		setUiDensity(userData, "roomy");
		setUiTheme(userData, "light");
		const vaultPath = "/home/luke/Google Drive/Phantasmal";
		setVaultPath(userData, vaultPath);

		expect(fs.existsSync(configFilePath(userData))).toBe(true);
		expect(readConfig(userData)).toEqual({
			vaultPath,
			uiDensity: "roomy",
			uiTheme: "light",
		});
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

	it("builds the Documents/Phantasmal default folder", () => {
		expect(defaultVaultPath("/home/luke/Documents")).toBe(
			path.join("/home/luke/Documents", "Phantasmal"),
		);
	});

	it("recovers from corrupt config JSON", () => {
		const userData = tempDir();
		writeConfig(userData, { vaultPath: null, uiDensity: "compact", uiTheme: "dark" });
		fs.writeFileSync(configFilePath(userData), "{not-json", "utf8");
		expect(readConfig(userData)).toEqual({
			vaultPath: null,
			uiDensity: "compact",
			uiTheme: "dark",
		});
	});
});
