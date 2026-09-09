import { describe, expect, it } from "vitest";
import type { BreakRecord } from "../shared/break";
import { isBreakActiveOn, lawsLabel, linkedReplacementLabel, toBreakView } from "./break-view";

function record(partial: Partial<BreakRecord> = {}): BreakRecord {
	return {
		id: "scroll-a1b2c3",
		name: "Late-night scrolling",
		cue: "In bed with the phone",
		note: "",
		color: "#c45c26",
		invisible: "Phone charges in the kitchen",
		unattractive: "",
		difficult: "App limits after 9pm",
		unsatisfying: "",
		replacementHabitIds: ["read-111"],
		cleanDays: ["2026-09-07", "2026-09-08", "2026-09-09"],
		archivedAt: null,
		archiveNote: "",
		createdAt: "2026-09-01T12:00:00.000Z",
		updatedAt: "2026-09-09T12:00:00.000Z",
		...partial,
	};
}

describe("break-view", () => {
	it("builds laws, streak, and replacement labels", () => {
		const view = toBreakView(
			record(),
			"2026-09-09",
			new Map([["read-111", { name: "Read 2 pages", archived: false }]]),
		);
		expect(view.cleanToday).toBe(true);
		expect(view.streak).toBe(3);
		expect(view.streakLabel).toBe("3 clean days");
		expect(view.lawsFilled).toBe(2);
		expect(view.lawsLabel).toBe("2 of 4 laws inverted");
		expect(view.linkedLabel).toBe("Instead: Read 2 pages");
		expect(view.laws[0]?.filled).toBe(true);
		expect(view.laws[1]?.filled).toBe(false);
	});

	it("formats empty and full plan labels", () => {
		expect(lawsLabel(0)).toBe("No inversion plan yet");
		expect(lawsLabel(4)).toBe("All four laws inverted");
		expect(linkedReplacementLabel([])).toBe("No replacement habit linked");
	});

	it("tracks break activity from created day until archived", () => {
		expect(isBreakActiveOn(record(), "2026-08-31")).toBe(false);
		expect(isBreakActiveOn(record(), "2026-09-01")).toBe(true);
		expect(isBreakActiveOn(record({ archivedAt: "2026-09-08T12:00:00.000Z" }), "2026-09-07")).toBe(
			true,
		);
		expect(isBreakActiveOn(record({ archivedAt: "2026-09-08T12:00:00.000Z" }), "2026-09-08")).toBe(
			false,
		);
	});
});
