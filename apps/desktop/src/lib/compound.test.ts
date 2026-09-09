import { describe, expect, it } from "vitest";
import { compoundGrowth } from "./compound";

describe("compoundGrowth", () => {
	it("matches the 1% daily improvement identity from Atomic Habits", () => {
		expect(compoundGrowth(0.01, 365)).toBeCloseTo(37.78, 2);
	});
});
