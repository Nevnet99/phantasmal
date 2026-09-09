import { describe, expect, it } from "vitest";
import {
	buildEvidence,
	isInWeek,
	periodLabel,
	startOfWeekMonday,
	tallyVotes,
	votesOpenLabel,
} from "./identity-view";

describe("identity-view", () => {
	it("starts weeks on Monday", () => {
		expect(startOfWeekMonday("2026-09-09")).toBe("2026-09-07");
		expect(isInWeek("2026-09-07", "2026-09-09")).toBe(true);
		expect(isInWeek("2026-09-13", "2026-09-09")).toBe(true);
		expect(isInWeek("2026-09-06", "2026-09-09")).toBe(false);
	});

	it("tallies today and week votes", () => {
		const tallies = tallyVotes(
			[
				{
					name: "Write",
					completions: ["2026-09-08", "2026-09-09", "2026-09-01"],
				},
				{ name: "Read", completions: ["2026-09-09"] },
			],
			"2026-09-09",
		);
		expect(tallies.voteCount).toBe(4);
		expect(tallies.votesToday).toBe(2);
		expect(tallies.votesWeek).toBe(3);
		expect(periodLabel(2, 3)).toBe("2 today · 3 this week");
	});

	it("builds recent evidence newest first", () => {
		const evidence = buildEvidence(
			[
				{ name: "Write", completions: ["2026-09-07", "2026-09-09"] },
				{ name: "Read", completions: ["2026-09-08"] },
			],
			3,
		);
		expect(evidence.map((row) => row.label)).toEqual(["Write · Wed", "Read · Tue", "Write · Mon"]);
	});

	it("labels open votes for Track groups", () => {
		expect(votesOpenLabel(0, true)).toBe("");
		expect(votesOpenLabel(1, true)).toBe("1 vote still open today");
		expect(votesOpenLabel(2, false)).toBe("2 votes still open");
	});
});
