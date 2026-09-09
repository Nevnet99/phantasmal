import { describe, expect, it } from "vitest";
import type { HabitRecord, HabitView } from "../shared/habits";
import { moveStackAmong, orderByStack, wouldCreateStackCycle } from "./stack";

function record(partial: Pick<HabitRecord, "id" | "name"> & Partial<HabitRecord>): HabitRecord {
	return {
		cue: "",
		note: "",
		schedule: { type: "daily" },
		stackAfterId: null,
		stackOrder: 0,
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
		stackOrder: 0,
		canMoveUp: false,
		canMoveDown: false,
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

	it("orders siblings by stackOrder before name", () => {
		const ordered = orderByStack([
			view({ id: "b", name: "B", stackAfterId: "root", stackOrder: 2 }),
			view({ id: "a", name: "A", stackAfterId: "root", stackOrder: 1 }),
			view({ id: "root", name: "Root", stackAfterId: null, stackOrder: 0 }),
		]);
		expect(ordered.map((habit) => habit.id)).toEqual(["root", "a", "b"]);
	});

	it("swaps sibling order and promotes in a chain", () => {
		const habits = [
			record({ id: "a", name: "A", stackAfterId: null, stackOrder: 0 }),
			record({ id: "b", name: "B", stackAfterId: "a", stackOrder: 0 }),
			record({ id: "c", name: "C", stackAfterId: "a", stackOrder: 1 }),
		];
		const swapped = moveStackAmong(habits, "c", "up");
		expect(swapped.find((habit) => habit.id === "c")?.stackOrder).toBe(0);
		expect(swapped.find((habit) => habit.id === "b")?.stackOrder).toBe(1);

		const chain = [
			record({ id: "a", name: "A", stackAfterId: null, stackOrder: 0 }),
			record({ id: "b", name: "B", stackAfterId: "a", stackOrder: 0 }),
		];
		const promoted = moveStackAmong(chain, "b", "up");
		expect(promoted.find((habit) => habit.id === "b")?.stackAfterId).toBeNull();
		expect(promoted.find((habit) => habit.id === "a")?.stackAfterId).toBe("b");
	});
});
