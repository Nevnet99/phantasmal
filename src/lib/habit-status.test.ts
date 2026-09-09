import { describe, expect, it } from "vitest";
import type { HabitRecord } from "../shared/habits";
import { isHabitActiveOn, isHabitArchived } from "./habit-status";

function habit(partial: Partial<HabitRecord> = {}): HabitRecord {
	return {
		id: "a",
		name: "A",
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

describe("habit-status", () => {
	it("treats null archive as active", () => {
		expect(isHabitArchived(habit())).toBe(false);
		expect(isHabitActiveOn(habit(), "2026-09-08")).toBe(true);
	});

	it("ignores days before the habit was created", () => {
		const created = habit({ createdAt: "2026-09-08T12:00:00.000Z" });
		expect(isHabitActiveOn(created, "2026-09-07")).toBe(false);
		expect(isHabitActiveOn(created, "2026-09-08")).toBe(true);
		expect(isHabitActiveOn(created, "2026-09-09")).toBe(true);
	});

	it("stops counting on and after the archive day", () => {
		const archived = habit({ archivedAt: "2026-09-08T15:00:00.000Z" });
		expect(isHabitArchived(archived)).toBe(true);
		expect(isHabitActiveOn(archived, "2026-09-07")).toBe(true);
		expect(isHabitActiveOn(archived, "2026-09-08")).toBe(false);
		expect(isHabitActiveOn(archived, "2026-09-09")).toBe(false);
	});
});
