import { describe, expect, it } from "vitest";
import {
	fallbackHabitColor,
	isHabitColor,
	randomHabitColor,
	resolveHabitColor,
} from "./habit-color";

describe("habit-color", () => {
	it("validates hex colors", () => {
		expect(isHabitColor("#5b8c5a")).toBe(true);
		expect(isHabitColor("#fff")).toBe(false);
		expect(isHabitColor("red")).toBe(false);
	});

	it("returns a stable fallback for the same habit id", () => {
		expect(fallbackHabitColor("walk-a1b2c3")).toBe(fallbackHabitColor("walk-a1b2c3"));
	});

	it("prefers a stored color over the fallback", () => {
		expect(resolveHabitColor("#3d8b9a", "walk-a1b2c3")).toBe("#3d8b9a");
		expect(resolveHabitColor(null, "walk-a1b2c3")).toBe(fallbackHabitColor("walk-a1b2c3"));
	});

	it("picks a random palette color", () => {
		expect(isHabitColor(randomHabitColor())).toBe(true);
	});
});
