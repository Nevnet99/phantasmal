import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { closeVault, openVaultAt } from "./fs-vault";
import {
	createHabit,
	getTrackSnapshot,
	listArchivedHabits,
	listHabits,
	toggleHabitDay,
	updateHabit,
	archiveHabit,
	removeHabit,
	restoreHabit,
} from "./habits";

const tempDirs: string[] = [];

afterEach(() => {
	closeVault();
	for (const dir of tempDirs.splice(0)) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

function tempVault(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "phantasmal-habits-"));
	tempDirs.push(dir);
	openVaultAt(dir);
	return dir;
}

describe("habits vault", () => {
	it("creates and lists habits", () => {
		tempVault();
		const created = createHabit({ name: "Read 2 pages", cue: "After coffee" }, "2026-09-08");
		expect(created.name).toBe("Read 2 pages");
		expect(created.cue).toBe("After coffee");
		expect(created.done).toBe(false);
		expect(created.streak).toBe(0);

		const listed = listHabits("2026-09-08");
		expect(listed).toHaveLength(1);
		expect(listed[0]?.id).toBe(created.id);
	});

	it("toggles a day and builds a streak", () => {
		tempVault();
		const habit = createHabit({ name: "Walk" }, "2026-09-08");

		toggleHabitDay(habit.id, "2026-09-07");
		const mid = toggleHabitDay(habit.id, "2026-09-08");
		expect(mid.done).toBe(true);
		expect(mid.streak).toBe(2);

		const undone = toggleHabitDay(habit.id, "2026-09-08");
		expect(undone.done).toBe(false);
		expect(undone.streak).toBe(1);
	});

	it("updates habit details", () => {
		tempVault();
		const habit = createHabit({ name: "Walk" }, "2026-09-08");
		const updated = updateHabit(
			habit.id,
			{ name: "Walk 10 minutes", cue: "After lunch", note: "Easy start" },
			"2026-09-08",
		);
		expect(updated.name).toBe("Walk 10 minutes");
		expect(updated.cue).toBe("After lunch");
		expect(updated.note).toBe("Easy start");
	});

	it("builds a track snapshot with graph and calendar", () => {
		tempVault();
		createHabit({ name: "Walk" }, "2026-09-08");
		const snap = getTrackSnapshot({ selectedDay: "2026-09-08", month: 9, year: 2026 });
		expect(snap.graph).toHaveLength(53 * 7);
		expect(snap.calendarCells.length).toBeGreaterThan(28);
		expect(snap.totalCount).toBe(1);
	});

	it("stacks a habit after another", () => {
		tempVault();
		const coffee = createHabit({ name: "Coffee" }, "2026-09-08");
		const meditate = createHabit({ name: "Meditate", stackAfterId: coffee.id }, "2026-09-08");
		expect(meditate.stackAfterId).toBe(coffee.id);
		expect(meditate.stackLabel).toBe("After Coffee");

		const snap = getTrackSnapshot({ selectedDay: "2026-09-08", month: 9, year: 2026 });
		expect(snap.habits.map((habit) => habit.id)).toEqual([coffee.id, meditate.id]);
	});

	it("rejects cyclic stacks", () => {
		tempVault();
		const a = createHabit({ name: "A" }, "2026-09-08");
		const b = createHabit({ name: "B", stackAfterId: a.id }, "2026-09-08");
		expect(() => updateHabit(a.id, { name: "A", stackAfterId: b.id }, "2026-09-08")).toThrow(
			/loop/,
		);
	});

	it("rejects empty names", () => {
		tempVault();
		expect(() => createHabit({ name: "   " }, "2026-09-08")).toThrow(/Name a habit/);
	});

	it("archives a habit out of the list while keeping graph history", () => {
		tempVault();
		const habit = createHabit({ name: "Walk" }, "2026-09-07");
		toggleHabitDay(habit.id, "2026-09-07");
		archiveHabit(habit.id, "Travel week", "2026-09-08");

		expect(listHabits("2026-09-08")).toHaveLength(0);
		const archived = listArchivedHabits();
		expect(archived).toHaveLength(1);
		expect(archived[0]?.archiveNote).toBe("Travel week");
		const snap = getTrackSnapshot({ selectedDay: "2026-09-08", month: 9, year: 2026 });
		const past = snap.graph.find((cell) => cell.day === "2026-09-07");
		expect(past?.doneNames).toEqual(["Walk"]);
	});

	it("restores an archived habit", () => {
		tempVault();
		const habit = createHabit({ name: "Walk" }, "2026-09-08");
		archiveHabit(habit.id, "Break", "2026-09-08");
		expect(listHabits("2026-09-08")).toHaveLength(0);

		const restored = restoreHabit(habit.id, "2026-09-08");
		expect(restored.archived).toBe(false);
		expect(restored.archiveNote).toBe("");
		expect(listHabits("2026-09-08").map((item) => item.id)).toEqual([habit.id]);
		expect(listArchivedHabits()).toHaveLength(0);
	});

	it("deletes a habit and clears stack pointers", () => {
		tempVault();
		const coffee = createHabit({ name: "Coffee" }, "2026-09-08");
		const meditate = createHabit({ name: "Meditate", stackAfterId: coffee.id }, "2026-09-08");
		removeHabit(coffee.id);
		expect(listHabits("2026-09-08").map((item) => item.id)).toEqual([meditate.id]);
		expect(listHabits("2026-09-08")[0]?.stackAfterId).toBeNull();
	});
});
