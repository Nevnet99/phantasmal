import { describe, expect, it } from "vitest";
import type { HabitRecord } from "../shared/habits";
import { activityLevel, buildContributionGraph, buildTrackSnapshot } from "./track-view";

function habit(partial: Partial<HabitRecord> & Pick<HabitRecord, "id" | "name">): HabitRecord {
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

describe("track-view", () => {
	it("maps completion ratios to activity levels", () => {
		expect(activityLevel(0, 4)).toBe(0);
		expect(activityLevel(1, 4)).toBe(1);
		expect(activityLevel(2, 4)).toBe(2);
		expect(activityLevel(3, 4)).toBe(3);
		expect(activityLevel(4, 4)).toBe(4);
	});

	it("builds a 53-week contribution graph", () => {
		const habits = [
			habit({ id: "a", name: "A", completions: ["2026-09-08"] }),
			habit({ id: "b", name: "B", completions: ["2026-09-08"] }),
		];
		const graph = buildContributionGraph(habits, "2026-09-08");
		expect(graph).toHaveLength(53 * 7);
		const cell = graph.find((item) => item.day === "2026-09-08");
		expect(cell?.completed).toBe(2);
		expect(cell?.level).toBe(4);
		expect(cell?.doneNames).toEqual(["A", "B"]);
		expect(cell?.missedNames).toEqual([]);
	});

	it("keeps archived habit history on the graph but drops it from today's list", () => {
		const habits = [
			habit({
				id: "a",
				name: "A",
				completions: ["2026-09-07", "2026-09-08"],
				archivedAt: "2026-09-08T12:00:00.000Z",
				archiveNote: "Too much",
			}),
			habit({ id: "b", name: "B", completions: [] }),
		];
		const snap = buildTrackSnapshot(habits, "2026-09-08", 9, 2026, "2026-09-08");
		expect(snap.habits.map((item) => item.id)).toEqual(["b"]);
		const past = snap.graph.find((item) => item.day === "2026-09-07");
		expect(past?.doneNames).toEqual(["A"]);
		const today = snap.graph.find((item) => item.day === "2026-09-08");
		expect(today?.doneNames).toEqual([]);
		expect(today?.missedNames).toEqual(["B"]);
	});

	it("starts counting a habit on the graph from its created day", () => {
		const habits = [
			habit({
				id: "new",
				name: "New",
				createdAt: "2026-09-08T12:00:00.000Z",
				completions: [],
			}),
		];
		const snap = buildTrackSnapshot(habits, "2026-09-08", 9, 2026, "2026-09-08");
		const before = snap.graph.find((item) => item.day === "2026-09-07");
		const created = snap.graph.find((item) => item.day === "2026-09-08");
		expect(before?.total).toBe(0);
		expect(before?.missedNames).toEqual([]);
		expect(created?.total).toBe(1);
		expect(created?.missedNames).toEqual(["New"]);
		expect(snap.calendarCells.find((cell) => cell.day === "2026-09-07")?.total).toBe(0);
		expect(snap.calendarCells.find((cell) => cell.day === "2026-09-08")?.total).toBe(1);
	});

	it("summarizes remaining habits for today", () => {
		const habits = [
			habit({ id: "a", name: "A", completions: ["2026-09-08"] }),
			habit({ id: "b", name: "B", completions: [] }),
		];
		const snap = buildTrackSnapshot(habits, "2026-09-08", 9, 2026, "2026-09-08");
		expect(snap.remainingCount).toBe(1);
		expect(snap.doneCount).toBe(1);
		expect(snap.remaining[0]?.id).toBe("b");
		expect(snap.calendarCells.some((cell) => cell.day === "2026-09-08" && cell.isSelected)).toBe(
			true,
		);
	});
});
