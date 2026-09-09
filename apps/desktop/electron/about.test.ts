import { describe, expect, it } from "vitest";
import { buildAppAbout, readAppVersion } from "./about";

describe("about", () => {
	it("reads a semver-like version from package.json", () => {
		expect(readAppVersion()).toMatch(/^\d+\.\d+\.\d+/);
	});

	it("builds about payload with credits and https links", () => {
		const about = buildAppAbout("1.2.3");
		expect(about.version).toBe("1.2.3");
		expect(about.credits.length).toBeGreaterThan(3);
		expect(about.links.every((link) => link.href.startsWith("https://"))).toBe(true);
		expect(about.links.some((link) => link.id === "releases")).toBe(true);
	});
});
