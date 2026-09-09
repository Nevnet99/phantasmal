import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { closeVault, openVaultAt } from "./fs-vault";
import { createHabit, toggleHabitDay } from "./habits";
import {
	archiveIdentity,
	createIdentity,
	listArchivedIdentities,
	listIdentities,
	removeIdentity,
	restoreIdentity,
	updateIdentity,
} from "./identity";
import { IDENTITY_DIRNAME } from "./schema";

const tempDirs: string[] = [];

afterEach(() => {
	closeVault();
	for (const dir of tempDirs.splice(0)) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

function tempVault(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "phantasmal-identity-"));
	tempDirs.push(dir);
	openVaultAt(dir);
	return dir;
}

describe("identity vault", () => {
	it("creates the identity folder with the vault layout", () => {
		const vaultDir = tempVault();
		expect(fs.existsSync(path.join(vaultDir, IDENTITY_DIRNAME))).toBe(true);
	});

	it("normalizes statements and counts votes from linked habits", () => {
		tempVault();
		const habit = createHabit({ name: "Write 100 words" }, "2026-09-08");
		toggleHabitDay(habit.id, "2026-09-07");
		toggleHabitDay(habit.id, "2026-09-08");

		const created = createIdentity(
			{
				statement: "a writer",
				note: "Pages over perfection",
				habitIds: [habit.id],
			},
			"2026-09-08",
		);
		expect(created.statement).toBe("I am a writer");
		expect(created.voteCount).toBe(2);
		expect(created.voteLabel).toBe("2 votes");
		expect(created.votesToday).toBe(1);
		expect(created.votesWeek).toBe(2);
		expect(created.periodLabel).toBe("1 today · 2 this week");
		expect(created.evidence[0]?.label).toBe("Write 100 words · Tue");
		expect(created.habitNames).toEqual(["Write 100 words"]);

		const snap = listIdentities("2026-09-08");
		expect(snap.identities).toHaveLength(1);
		expect(snap.habitOptions.some((option) => option.id === habit.id)).toBe(true);
	});

	it("updates and removes identities", () => {
		tempVault();
		const habit = createHabit({ name: "Run" }, "2026-09-08");
		const created = createIdentity({ statement: "I am a runner", habitIds: [] });
		const updated = updateIdentity(created.id, {
			statement: "I am an athlete",
			note: "Show up",
			habitIds: [habit.id],
		});
		expect(updated.statement).toBe("I am an athlete");
		expect(updated.note).toBe("Show up");
		expect(updated.habitIds).toEqual([habit.id]);

		removeIdentity(created.id);
		expect(listIdentities().identities).toHaveLength(0);
	});

	it("archives and restores identities", () => {
		tempVault();
		const created = createIdentity({ statement: "I am a writer" }, "2026-09-08");
		const archived = archiveIdentity(created.id, "Season over", "2026-09-09");
		expect(archived.archived).toBe(true);
		expect(archived.archiveNote).toBe("Season over");
		expect(listIdentities().identities).toHaveLength(0);
		expect(listArchivedIdentities()).toHaveLength(1);

		const restored = restoreIdentity(created.id);
		expect(restored.archived).toBe(false);
		expect(listIdentities().identities).toHaveLength(1);
	});

	it("rejects empty statements", () => {
		tempVault();
		expect(() => createIdentity({ statement: "   " })).toThrow(/person you want to become/);
	});
});
