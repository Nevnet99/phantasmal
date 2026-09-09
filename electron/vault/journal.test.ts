import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { closeVault, openVaultAt } from "./fs-vault";
import { createHabit, removeHabit } from "./habits";
import { createBreak } from "./breaks";
import {
	getJournal,
	listJournalSummariesForDay,
	removeJournal,
	saveJournal,
	unlinkHabitFromJournals,
} from "./journal";
import { JOURNAL_DIRNAME } from "./schema";

const tempDirs: string[] = [];

afterEach(() => {
	closeVault();
	for (const dir of tempDirs.splice(0)) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

function tempVault(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "phantasmal-journal-"));
	tempDirs.push(dir);
	openVaultAt(dir);
	return dir;
}

describe("journal vault", () => {
	it("creates the journal folder with the vault layout", () => {
		const vaultDir = tempVault();
		expect(fs.existsSync(path.join(vaultDir, JOURNAL_DIRNAME))).toBe(true);
	});

	it("saves mood, markdown, and habit hashtags for a day", () => {
		tempVault();
		const habit = createHabit({ name: "Eat Breakfast" }, "2026-09-09");
		const saved = saveJournal({
			day: "2026-09-09",
			mood: "good",
			title: "Solid morning",
			body: "Started with #eat-breakfast and some notes.\n\n## Wins\n\n- coffee",
		});
		expect(saved.mood).toBe("good");
		expect(saved.title).toBe("Solid morning");
		expect(saved.id).toMatch(/^2026-09-09-[a-f0-9]{6}$/);
		expect(saved.habitIds).toEqual([habit.id]);
		expect(saved.habits[0]?.tag).toBe("eat-breakfast");

		const snap = getJournal("2026-09-09");
		expect(snap.entry.body).toContain("#eat-breakfast");
		expect(snap.dayEntries).toHaveLength(1);
		expect(snap.habitOptions.some((option) => option.id === habit.id)).toBe(true);
	});

	it("allows multiple entries on the same day", () => {
		tempVault();
		const morning = saveJournal({
			day: "2026-09-09",
			title: "Morning",
			body: "Coffee",
			mood: "good",
		});
		const evening = saveJournal({
			day: "2026-09-09",
			title: "Evening",
			body: "Walk",
			mood: "great",
		});
		expect(morning.id).not.toBe(evening.id);

		const snap = getJournal({ day: "2026-09-09", entryId: morning.id });
		expect(snap.entry.title).toBe("Morning");
		expect(snap.dayEntries.map((entry) => entry.id)).toEqual([morning.id, evening.id]);

		const latest = getJournal("2026-09-09");
		expect(latest.entry.id).toBe(evening.id);
	});

	it("lists day summaries in created order for Track links", () => {
		tempVault();
		const morning = saveJournal({
			day: "2026-09-09",
			title: "Morning",
			body: "Coffee",
			mood: "good",
		});
		const evening = saveJournal({
			day: "2026-09-09",
			title: "Evening",
			body: "Walk",
			mood: "great",
		});
		expect(listJournalSummariesForDay("2026-09-09").map((entry) => entry.id)).toEqual([
			morning.id,
			evening.id,
		]);
	});

	it("keeps same-day entry order stable when an older entry is edited", () => {
		tempVault();
		const morning = saveJournal({
			day: "2026-09-09",
			title: "Morning",
			body: "Coffee",
			mood: "good",
		});
		const evening = saveJournal({
			day: "2026-09-09",
			title: "Evening",
			body: "Walk",
			mood: "great",
		});

		saveJournal({
			day: "2026-09-09",
			id: morning.id,
			title: "Morning revised",
			body: "Coffee and notes",
			mood: "good",
		});

		const snap = getJournal({ day: "2026-09-09", entryId: morning.id });
		expect(snap.dayEntries.map((entry) => entry.id)).toEqual([morning.id, evening.id]);
		expect(snap.dayEntries[0]?.title).toBe("Morning revised");
	});

	it("removes blank entries and supports delete by id", () => {
		tempVault();
		const saved = saveJournal({ day: "2026-09-09", title: "Temp", body: "hi", mood: "ok" });
		expect(getJournal("2026-09-09").entry.isEmpty).toBe(false);

		saveJournal({ day: "2026-09-09", id: saved.id, title: "", body: "", mood: null, habitIds: [] });
		expect(getJournal("2026-09-09").entry.isEmpty).toBe(true);

		const keep = saveJournal({ day: "2026-09-08", title: "Keep", body: "x", mood: "great" });
		removeJournal(keep.id);
		expect(getJournal("2026-09-08").entry.isEmpty).toBe(true);
	});

	it("strips deleted habit tags from journal entries", () => {
		tempVault();
		const habit = createHabit({ name: "Walk" }, "2026-09-09");
		saveJournal({
			day: "2026-09-09",
			title: "Out",
			body: "Went for a #walk today.",
			mood: "good",
		});
		expect(getJournal("2026-09-09").entry.habitIds).toEqual([habit.id]);

		const removed = removeHabit(habit.id);
		unlinkHabitFromJournals(removed.id, removed.tag);

		const entry = getJournal("2026-09-09").entry;
		expect(entry.habitIds).toEqual([]);
		expect(entry.habits).toEqual([]);
		expect(entry.body).not.toContain("#walk");
		expect(entry.body).toContain("Went for a");
	});

	it("resolves break hashtags in journal entries", () => {
		tempVault();
		const item = createBreak({ name: "Late scrolling" }, "2026-09-09");
		const saved = saveJournal({
			day: "2026-09-09",
			title: "Resisted",
			body: "Skipped #late-scrolling tonight.",
			mood: "good",
		});
		expect(saved.habitIds).toEqual([item.id]);
		expect(saved.habits[0]?.kind).toBe("break");
		expect(saved.habits[0]?.tag).toBe("late-scrolling");

		const snap = getJournal("2026-09-09");
		expect(
			snap.habitOptions.some((option) => option.id === item.id && option.kind === "break"),
		).toBe(true);
	});

	it("drops habit ids when hashtags are removed from the body", () => {
		tempVault();
		const habit = createHabit({ name: "Walk" }, "2026-09-09");
		const saved = saveJournal({
			day: "2026-09-09",
			title: "Out",
			body: "Went for a #walk today.",
			mood: "good",
		});
		expect(getJournal("2026-09-09").entry.habitIds).toEqual([habit.id]);

		const cleared = saveJournal({
			day: "2026-09-09",
			id: saved.id,
			title: "Out",
			body: "Went for a walk today.",
			mood: "good",
			habitIds: [habit.id],
		});
		expect(cleared.habitIds).toEqual([]);
		expect(cleared.habits).toEqual([]);
		expect(getJournal({ day: "2026-09-09", entryId: saved.id }).entry.habitIds).toEqual([]);
	});

	it("reads legacy day-named journal files and migrates on save", () => {
		const vaultDir = tempVault();
		const legacyPath = path.join(vaultDir, JOURNAL_DIRNAME, "2026-09-09.json");
		fs.writeFileSync(
			legacyPath,
			JSON.stringify({
				id: "2026-09-09",
				day: "2026-09-09",
				mood: "ok",
				title: "Legacy",
				body: "Old single-entry day file",
				habitIds: [],
				createdAt: "2026-09-09T10:00:00.000Z",
				updatedAt: "2026-09-09T10:00:00.000Z",
			}),
		);

		const snap = getJournal("2026-09-09");
		expect(snap.entry.title).toBe("Legacy");
		expect(snap.entry.id).toBe("2026-09-09");

		const saved = saveJournal({
			day: "2026-09-09",
			id: "2026-09-09",
			title: "Legacy",
			body: "Migrated",
			mood: "ok",
		});
		expect(saved.id).toMatch(/^2026-09-09-[a-f0-9]{6}$/);
		expect(fs.existsSync(legacyPath)).toBe(false);
		expect(fs.existsSync(path.join(vaultDir, JOURNAL_DIRNAME, `${saved.id}.json`))).toBe(true);
	});
});
