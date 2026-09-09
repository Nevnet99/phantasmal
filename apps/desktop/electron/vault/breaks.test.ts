import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { closeVault, openVaultAt } from "./fs-vault";
import { createHabit } from "./habits";
import {
	archiveBreak,
	createBreak,
	listArchivedBreaks,
	listBreaks,
	removeBreak,
	restoreBreak,
	toggleBreakCleanDay,
	updateBreak,
} from "./breaks";
import { BREAKS_DIRNAME } from "./schema";

const tempDirs: string[] = [];

afterEach(() => {
	closeVault();
	for (const dir of tempDirs.splice(0)) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

function tempVault(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "phantasmal-breaks-"));
	tempDirs.push(dir);
	openVaultAt(dir);
	return dir;
}

describe("breaks vault", () => {
	it("creates the breaks folder with the vault layout", () => {
		const vaultDir = tempVault();
		expect(fs.existsSync(path.join(vaultDir, BREAKS_DIRNAME))).toBe(true);
	});

	it("creates, lists, and toggles clean days", () => {
		tempVault();
		const habit = createHabit({ name: "Read 2 pages" }, "2026-09-09");
		const created = createBreak(
			{
				name: "Late-night scrolling",
				cue: "In bed",
				invisible: "Charge phone in kitchen",
				replacementHabitIds: [habit.id],
			},
			"2026-09-09",
		);
		expect(created.name).toBe("Late-night scrolling");
		expect(created.cleanToday).toBe(false);
		expect(created.linkedLabel).toContain("Read 2 pages");
		expect(created.lawsFilled).toBe(1);

		const cleaned = toggleBreakCleanDay(created.id, "2026-09-09");
		expect(cleaned.cleanToday).toBe(true);
		expect(cleaned.streak).toBe(1);

		const snap = listBreaks("2026-09-09");
		expect(snap.breaks).toHaveLength(1);
		expect(snap.habitOptions.some((option) => option.id === habit.id)).toBe(true);
	});

	it("updates inversion plan fields and archives", () => {
		tempVault();
		const created = createBreak({ name: "Sugar" }, "2026-09-09");
		const updated = updateBreak(
			created.id,
			{
				name: "Sugar",
				difficult: "Do not keep sweets at home",
				unsatisfying: "Log every slip in Journal",
			},
			"2026-09-09",
		);
		expect(updated.difficult).toContain("sweets");
		expect(updated.lawsFilled).toBe(2);

		archiveBreak(created.id, "Paused", "2026-09-09");
		expect(listBreaks("2026-09-09").breaks).toHaveLength(0);
		expect(listArchivedBreaks("2026-09-09")).toHaveLength(1);

		restoreBreak(created.id, "2026-09-09");
		expect(listBreaks("2026-09-09").breaks).toHaveLength(1);

		removeBreak(created.id);
		expect(listBreaks("2026-09-09").breaks).toHaveLength(0);
	});
});
