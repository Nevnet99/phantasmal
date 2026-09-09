import { describe, expect, it } from "vitest";
import { compoundGrowth } from "./compound";

describe("compoundGrowth", () => {
	it("matches 1% daily compounding toward ~37× over a year", () => {
		expect(compoundGrowth(0.01, 365)).toBeCloseTo(37.78, 2);
	});
});
