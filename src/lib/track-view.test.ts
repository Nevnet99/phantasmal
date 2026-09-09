import { describe, expect, it } from "vitest";
import type { HabitRecord } from "../shared/habits";
import { activityLevel, buildHabitGraph, buildTrackSnapshot } from "./track-view";

function habit(partial: Partial<HabitRecord> & Pick<HabitRecord, "id" | "name">): HabitRecord {
	return {
		cue: "",
		note: "",
		color: "#5b8c5a",
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

	it("builds a habit × day matrix for a calendar month", () => {
		const habits = [
			habit({ id: "a", name: "A", color: "#5b8c5a", completions: ["2026-09-08"] }),
			habit({ id: "b", name: "B", color: "#3d8b9a", completions: [] }),
		];
		const graph = buildHabitGraph(habits, 2026, 9, "2026-09-08", "2026-09-08");
		expect(graph.days).toHaveLength(30);
		expect(graph.days[0]?.day).toBe("2026-09-01");
		expect(graph.days[7]?.day).toBe("2026-09-08");
		expect(graph.rows.map((row) => row.name)).toEqual(["A", "B"]);
		expect(graph.rows[0]?.cells[7]?.state).toBe("done");
		expect(graph.rows[1]?.cells[7]?.state).toBe("missed");
		expect(graph.rows[0]?.cells[8]?.state).toBe("off");
		expect(graph.rows[1]?.cells[8]?.state).toBe("off");
		expect(graph.rows[0]?.streak).toBe(1);
		expect(graph.rows[1]?.streak).toBe(0);
		expect(graph.rows[0]?.streakLabel).toBe("Streak: 1 day");
		expect(graph.rows[0]?.color).toBe("#5b8c5a");
		expect(graph.rows[1]?.color).toBe("#3d8b9a");
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
		const rowA = snap.habitGraph.rows.find((row) => row.habitId === "a");
		const rowB = snap.habitGraph.rows.find((row) => row.habitId === "b");
		const day7 = snap.habitGraph.days.findIndex((day) => day.day === "2026-09-07");
		const day8 = snap.habitGraph.days.findIndex((day) => day.day === "2026-09-08");
		expect(rowA?.cells[day7]?.state).toBe("done");
		expect(rowA?.cells[day8]?.state).toBe("off");
		expect(rowB?.cells[day8]?.state).toBe("missed");
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
		const row = snap.habitGraph.rows[0];
		const day7 = snap.habitGraph.days.findIndex((day) => day.day === "2026-09-07");
		const day8 = snap.habitGraph.days.findIndex((day) => day.day === "2026-09-08");
		expect(row?.cells[day7]?.state).toBe("off");
		expect(row?.cells[day8]?.state).toBe("missed");
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

	it("keeps hasHabits when a past day has nothing due", () => {
		const habits = [
			habit({
				id: "new",
				name: "New",
				createdAt: "2026-09-08T12:00:00.000Z",
				completions: [],
			}),
		];
		const snap = buildTrackSnapshot(habits, "2026-09-01", 9, 2026, "2026-09-08");
		expect(snap.hasHabits).toBe(true);
		expect(snap.totalCount).toBe(0);
		expect(snap.habits).toEqual([]);
		expect(snap.summaryLabel).toBe("Nothing scheduled");
	});

	it("adds a Journal row when journaled days are provided", () => {
		const habits = [habit({ id: "a", name: "A", color: "#5b8c5a" })];
		const journaled = new Set(["2026-09-07", "2026-09-08"]);
		const graph = buildHabitGraph(
			habits,
			2026,
			9,
			"2026-09-08",
			"2026-09-08",
			journaled,
			"2026-09-01",
		);
		expect(graph.rows[0]?.habitId).toBe("__journal__");
		expect(graph.rows[0]?.name).toBe("Journal");
		expect(graph.rows[0]?.cells[6]?.state).toBe("done");
		expect(graph.rows[0]?.cells[7]?.state).toBe("done");
		expect(graph.rows[0]?.cells[5]?.state).toBe("missed");
		expect(graph.rows[0]?.cells[8]?.state).toBe("off");
		expect(graph.rows[0]?.streak).toBe(2);
		expect(graph.rows.map((row) => row.name)).toEqual(["Journal", "A"]);
	});

	it("does not mark journal days missed before tracking started", () => {
		const habits = [habit({ id: "a", name: "A", color: "#5b8c5a" })];
		const journaled = new Set(["2026-09-08"]);
		const graph = buildHabitGraph(
			habits,
			2026,
			9,
			"2026-09-08",
			"2026-09-08",
			journaled,
			"2026-09-08",
		);
		expect(graph.rows[0]?.cells[5]?.state).toBe("off");
		expect(graph.rows[0]?.cells[6]?.state).toBe("off");
		expect(graph.rows[0]?.cells[7]?.state).toBe("done");
		expect(graph.rows[0]?.streak).toBe(1);
	});

	it("still shows journaled days before tracking started as done", () => {
		const habits = [habit({ id: "a", name: "A", color: "#5b8c5a" })];
		const journaled = new Set(["2026-09-05", "2026-09-08"]);
		const graph = buildHabitGraph(
			habits,
			2026,
			9,
			"2026-09-08",
			"2026-09-08",
			journaled,
			"2026-09-08",
		);
		expect(graph.rows[0]?.cells[4]?.state).toBe("done");
		expect(graph.rows[0]?.cells[5]?.state).toBe("off");
		expect(graph.rows[0]?.cells[7]?.state).toBe("done");
	});
});
