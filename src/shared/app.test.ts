import { describe, expect, it } from "vitest";
import { isAllowedExternalUrl } from "./app";

describe("app shared", () => {
	it("allows http(s) urls only", () => {
		expect(isAllowedExternalUrl("https://github.com/Nevnet99/phantasmal")).toBe(true);
		expect(isAllowedExternalUrl("http://example.com")).toBe(true);
		expect(isAllowedExternalUrl("file:///tmp/x")).toBe(false);
		expect(isAllowedExternalUrl("javascript:alert(1)")).toBe(false);
		expect(isAllowedExternalUrl("not a url")).toBe(false);
	});
});
