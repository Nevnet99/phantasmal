import { describe, expect, it } from "vitest";
import type { HabitSchedule } from "../shared/habits";
import { isDueOn, normalizeSchedule, scheduleLabel, streakOnSchedule } from "./schedule";

describe("schedule", () => {
	it("treats daily as always due", () => {
		expect(isDueOn({ type: "daily" }, "2026-09-08")).toBe(true);
	});

	it("supports every other Monday from an anchor week", () => {
		const schedule: HabitSchedule = {
			type: "weekly",
			weekdays: [0],
			intervalWeeks: 2,
			anchorDay: "2026-09-07",
		};
		expect(isDueOn(schedule, "2026-09-07")).toBe(true);
		expect(isDueOn(schedule, "2026-09-14")).toBe(false);
		expect(isDueOn(schedule, "2026-09-21")).toBe(true);
		expect(isDueOn(schedule, "2026-09-08")).toBe(false);
	});

	it("supports every other day", () => {
		const schedule: HabitSchedule = {
			type: "every_n_days",
			intervalDays: 2,
			anchorDay: "2026-09-01",
		};
		expect(isDueOn(schedule, "2026-09-01")).toBe(true);
		expect(isDueOn(schedule, "2026-09-02")).toBe(false);
		expect(isDueOn(schedule, "2026-09-03")).toBe(true);
	});

	it("counts streaks across due days only", () => {
		const schedule: HabitSchedule = {
			type: "weekly",
			weekdays: [0],
			intervalWeeks: 1,
			anchorDay: "2026-09-01",
		};
		expect(
			streakOnSchedule(["2026-09-07", "2026-09-14", "2026-09-21"], schedule, "2026-09-21"),
		).toBe(3);
		expect(streakOnSchedule(["2026-09-07", "2026-09-21"], schedule, "2026-09-21")).toBe(1);
	});

	it("normalizes missing schedule to daily", () => {
		expect(normalizeSchedule(undefined, "2026-09-08")).toEqual({ type: "daily" });
		expect(
			scheduleLabel({
				type: "weekly",
				weekdays: [0],
				intervalWeeks: 2,
				anchorDay: "2026-09-07",
			}),
		).toBe("Every other week · Mon");
	});
});
