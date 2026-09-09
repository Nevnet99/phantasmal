import { describe, expect, it } from "vitest";
import {
	extractHashtagSlugs,
	filterHabitTagSuggestions,
	habitTagSlug,
	renderJournalMarkdown,
	resolveHabitIdsFromBody,
	stripHabitTagFromBody,
	uniqueJournalTag,
} from "./journal-markdown";

describe("journal-markdown", () => {
	it("slugifies habit names for hashtags", () => {
		expect(habitTagSlug("Eat Breakfast")).toBe("eat-breakfast");
		expect(habitTagSlug("Learn a programming concept from book")).toBe(
			"learn-a-programming-concept-from-book",
		);
	});

	it("disambiguates colliding journal tags", () => {
		const taken = new Set(["walk"]);
		expect(uniqueJournalTag("walk", taken)).toBe("walk-break");
		taken.add("walk-break");
		expect(uniqueJournalTag("walk", taken)).toBe("walk-break-2");
	});

	it("extracts and resolves habit hashtags", () => {
		const body = "Did #eat-breakfast then #walk and unknown #zzz.";
		expect(extractHashtagSlugs(body)).toEqual(["eat-breakfast", "walk", "zzz"]);
		const ids = resolveHabitIdsFromBody(body, [
			{
				id: "eat-breakfast-aa",
				name: "Eat Breakfast",
				tag: "eat-breakfast",
				archived: false,
				color: "#5b8c5a",
			},
			{ id: "walk-bb", name: "Walk", tag: "walk", archived: false, color: "#3d8b9a" },
		]);
		expect(ids).toEqual(["eat-breakfast-aa", "walk-bb"]);
		expect(
			resolveHabitIdsFromBody("No tags left.", [
				{
					id: "eat-breakfast-aa",
					name: "Eat Breakfast",
					tag: "eat-breakfast",
					archived: false,
					color: "#5b8c5a",
				},
			]),
		).toEqual([]);
	});

	it("strips a habit hashtag from journal markdown", () => {
		expect(stripHabitTagFromBody("Did #eat-breakfast then walked.", "eat-breakfast")).toBe(
			"Did  then walked.",
		);
		expect(stripHabitTagFromBody("#eat-breakfast\nMore", "eat-breakfast")).toBe("\nMore");
		expect(stripHabitTagFromBody("Keep #eat-breakfasts alone", "eat-breakfast")).toBe(
			"Keep #eat-breakfasts alone",
		);
	});

	it("filters tag suggestions by query", () => {
		const options = [
			{ id: "a", name: "Eat Breakfast", tag: "eat-breakfast", archived: false, color: "#5b8c5a" },
			{
				id: "b",
				name: "Evening stretch",
				tag: "evening-stretch",
				archived: false,
				color: "#3d8b9a",
			},
			{ id: "c", name: "Old", tag: "old", archived: true, color: "#c4873a" },
		];
		expect(filterHabitTagSuggestions("eat", options).map((item) => item.id)).toEqual(["a"]);
		expect(filterHabitTagSuggestions("", options)).toHaveLength(2);
	});

	it("renders a safe markdown subset", () => {
		const html = renderJournalMarkdown("# Hello\n\n**bold** and #eat-breakfast\n\n- one");
		expect(html).toContain("<h1>Hello</h1>");
		expect(html).toContain("<strong>bold</strong>");
		expect(html).toContain('<span class="journal-tag">#eat-breakfast</span>');
		expect(html).toContain("<li>one</li>");
		expect(renderJournalMarkdown("<script>x</script>")).toContain("&lt;script&gt;");
	});
});
