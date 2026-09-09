import { describe, expect, it } from "vitest";
import { quoteDesktopExec } from "./linux-desktop";

describe("quoteDesktopExec", () => {
	it("leaves simple paths unquoted", () => {
		expect(quoteDesktopExec("/home/luke/Apps/Phantasmal.AppImage")).toBe(
			"/home/luke/Apps/Phantasmal.AppImage",
		);
	});

	it("quotes paths with spaces", () => {
		expect(quoteDesktopExec("/home/luke/My Apps/Phantasmal.AppImage")).toBe(
			'"/home/luke/My Apps/Phantasmal.AppImage"',
		);
	});

	it("escapes quotes inside the path", () => {
		expect(quoteDesktopExec('/tmp/weird"name.AppImage')).toBe('"/tmp/weird\\"name.AppImage"');
	});
});
