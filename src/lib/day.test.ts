import { describe, expect, it } from "vitest";
import { formatDayLabel, localDayKey, shiftDayKey, streakEndingOn } from "./day";

describe("day helpers", () => {
	it("formats and shifts local day keys", () => {
		expect(shiftDayKey("2026-09-08", -1)).toBe("2026-09-07");
		expect(shiftDayKey("2026-03-01", -1)).toBe("2026-02-28");
		expect(localDayKey(new Date(2026, 8, 8))).toBe("2026-09-08");
		expect(formatDayLabel("2026-09-08")).toMatch(/Sep/);
	});

	it("counts streaks ending today or yesterday", () => {
		expect(streakEndingOn(["2026-09-06", "2026-09-07", "2026-09-08"], "2026-09-08")).toBe(3);
		expect(streakEndingOn(["2026-09-06", "2026-09-07"], "2026-09-08")).toBe(2);
		expect(streakEndingOn(["2026-09-05"], "2026-09-08")).toBe(0);
		expect(streakEndingOn([], "2026-09-08")).toBe(0);
	});
});
