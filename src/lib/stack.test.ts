import { describe, expect, it } from "vitest";
import type { HabitRecord, HabitView } from "../shared/habits";
import { orderByStack, wouldCreateStackCycle } from "./stack";

function record(partial: Pick<HabitRecord, "id" | "name"> & Partial<HabitRecord>): HabitRecord {
	return {
		cue: "",
		note: "",
		schedule: { type: "daily" },
		stackAfterId: null,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		archivedAt: null,
		archiveNote: "",
		completions: [],
		...partial,
	};
}

function view(partial: Pick<HabitView, "id" | "name"> & Partial<HabitView>): HabitView {
	return {
		cue: "",
		note: "",
		schedule: { type: "daily" },
		scheduleLabel: "Every day",
		stackAfterId: null,
		stackAfterName: "",
		stackLabel: "",
		stackDepth: 0,
		due: true,
		done: false,
		streak: 0,
		streakLabel: "Streak: 0 days",
		archived: false,
		archivedAt: "",
		archiveNote: "",
		archivedLabel: "",
		...partial,
	};
}

describe("stack", () => {
	it("detects cycles", () => {
		const habits = [
			record({ id: "a", name: "A", stackAfterId: null }),
			record({ id: "b", name: "B", stackAfterId: "a" }),
		];
		expect(wouldCreateStackCycle(habits, "a", "b")).toBe(true);
		expect(wouldCreateStackCycle(habits, "b", "a")).toBe(false);
		expect(wouldCreateStackCycle(habits, "a", "a")).toBe(true);
	});

	it("orders a stack root then children", () => {
		const ordered = orderByStack([
			view({ id: "meditate", name: "Meditate", stackAfterId: "coffee", stackDepth: 1 }),
			view({ id: "coffee", name: "Coffee", stackAfterId: null, stackDepth: 0 }),
			view({ id: "walk", name: "Walk", stackAfterId: null, stackDepth: 0 }),
		]);
		expect(ordered.map((habit) => habit.id)).toEqual(["coffee", "meditate", "walk"]);
	});
});
