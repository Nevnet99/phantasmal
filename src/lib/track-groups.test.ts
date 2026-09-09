import { describe, expect, it } from "vitest";
import type { HabitView } from "../shared/habits";
import { buildTrackGroups } from "./track-groups";

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

describe("track groups", () => {
	it("keeps a stack family under one identity", () => {
		const habits = [
			view({ id: "coffee", name: "Coffee" }),
			view({
				id: "write",
				name: "Write",
				stackAfterId: "coffee",
				stackDepth: 1,
				stackLabel: "After Coffee",
			}),
		];
		const groups = buildTrackGroups(habits, [
			{ id: "writer", statement: "I am a writer", habitIds: ["write"] },
		]);
		expect(groups).toHaveLength(1);
		expect(groups[0]?.title).toBe("I am a writer");
		expect(groups[0]?.habits.map((habit) => habit.id)).toEqual(["coffee", "write"]);
		expect(groups[0]?.votesOpenLabel).toBe("2 votes still open today");
	});

	it("puts unlinked habits in Other", () => {
		const groups = buildTrackGroups(
			[view({ id: "walk", name: "Walk" }), view({ id: "write", name: "Write" })],
			[{ id: "writer", statement: "I am a writer", habitIds: ["write"] }],
		);
		expect(groups.map((group) => group.key)).toEqual(["writer", "other"]);
		expect(groups[1]?.habits.map((habit) => habit.id)).toEqual(["walk"]);
		expect(groups[0]?.votesOpenLabel).toBe("1 vote still open today");
		expect(groups[1]?.votesOpenLabel).toBe("");
	});

	it("clears the open-votes prompt when the group is done", () => {
		const groups = buildTrackGroups(
			[view({ id: "write", name: "Write", done: true })],
			[{ id: "writer", statement: "I am a writer", habitIds: ["write"] }],
		);
		expect(groups[0]?.votesOpenLabel).toBe("");
	});
});
