/** Markdown helpers for journal bodies and habit hashtags. */

import type { JournalHabitOption } from "../shared/journal";

const HASHTAG_RE = /(?:^|[\s([{])#([a-z0-9]+(?:-[a-z0-9]+)*)/gi;

export function habitTagSlug(name: string): string {
	const slug = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 48);
	return slug || "habit";
}

/** Pick a free #slug; if taken, try `slug-break`, then `slug-break-2`, … */
export function uniqueJournalTag(base: string, taken: ReadonlySet<string>): string {
	const normalized = (base.toLowerCase() || "habit").replace(/^-+|-+$/g, "") || "habit";
	if (!taken.has(normalized)) return normalized;
	let candidate = `${normalized}-break`;
	let n = 2;
	while (taken.has(candidate)) {
		candidate = `${normalized}-break-${n}`;
		n += 1;
	}
	return candidate;
}

export function extractHashtagSlugs(body: string): string[] {
	const found = new Set<string>();
	for (const match of body.matchAll(HASHTAG_RE)) {
		const slug = match[1]?.toLowerCase();
		if (slug) found.add(slug);
	}
	return [...found];
}

/** Remove `#tag` tokens for a deleted habit from journal markdown. */
export function stripHabitTagFromBody(body: string, tag: string): string {
	const escaped = tag.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	if (!escaped) return body;
	const re = new RegExp(`(^|[\\s([{])#${escaped}(?![a-z0-9-])`, "gi");
	return body.replace(re, "$1");
}

/** Resolve #slugs in the body to habit/break ids (body is the source of truth). */
export function resolveHabitIdsFromBody(body: string, options: JournalHabitOption[]): string[] {
	const byTag = new Map<string, string>();
	for (const option of options) {
		const tag = option.tag.toLowerCase();
		if (!byTag.has(tag)) byTag.set(tag, option.id);
	}
	const byId = new Set(options.map((option) => option.id));
	const next: string[] = [];
	const seen = new Set<string>();

	for (const slug of extractHashtagSlugs(body)) {
		const id = byTag.get(slug);
		if (!id || !byId.has(id) || seen.has(id)) continue;
		seen.add(id);
		next.push(id);
	}
	return next;
}

export function filterHabitTagSuggestions(
	query: string,
	options: JournalHabitOption[],
	limit = 6,
): JournalHabitOption[] {
	const q = query.trim().toLowerCase().replace(/^#/, "");
	const active = options.filter((option) => !option.archived);
	const ranked = active
		.map((option) => {
			const name = option.name.toLowerCase();
			const tag = option.tag.toLowerCase();
			let score = 0;
			if (!q) score = 1;
			else if (tag.startsWith(q)) score = 3;
			else if (name.startsWith(q)) score = 2;
			else if (tag.includes(q) || name.includes(q)) score = 1;
			return { option, score };
		})
		.filter((row) => row.score > 0)
		.sort(
			(a, b) =>
				b.score - a.score ||
				a.option.name.localeCompare(b.option.name) ||
				a.option.id.localeCompare(b.option.id),
		);
	return ranked.slice(0, limit).map((row) => row.option);
}

/** Escape HTML then apply a small, safe markdown subset for preview. */
export function renderJournalMarkdown(source: string): string {
	const escaped = escapeHtml(source);
	const lines = escaped.replace(/\r\n/g, "\n").split("\n");
	const html: string[] = [];
	let inUl = false;
	let inOl = false;

	function closeLists(): void {
		if (inUl) {
			html.push("</ul>");
			inUl = false;
		}
		if (inOl) {
			html.push("</ol>");
			inOl = false;
		}
	}

	for (const rawLine of lines) {
		const line = rawLine;
		const heading = /^(#{1,3})\s+(.+)$/.exec(line);
		if (heading) {
			closeLists();
			const level = heading[1].length;
			html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
			continue;
		}

		const ul = /^[-*]\s+(.+)$/.exec(line);
		if (ul) {
			if (inOl) {
				html.push("</ol>");
				inOl = false;
			}
			if (!inUl) {
				html.push("<ul>");
				inUl = true;
			}
			html.push(`<li>${inlineMarkdown(ul[1])}</li>`);
			continue;
		}

		const ol = /^\d+\.\s+(.+)$/.exec(line);
		if (ol) {
			if (inUl) {
				html.push("</ul>");
				inUl = false;
			}
			if (!inOl) {
				html.push("<ol>");
				inOl = true;
			}
			html.push(`<li>${inlineMarkdown(ol[1])}</li>`);
			continue;
		}

		if (!line.trim()) {
			closeLists();
			continue;
		}

		closeLists();
		html.push(`<p>${inlineMarkdown(line)}</p>`);
	}

	closeLists();
	return html.join("") || "<p></p>";
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function inlineMarkdown(value: string): string {
	return value
		.replace(/`([^`]+)`/g, "<code>$1</code>")
		.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
		.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>")
		.replace(/(^|[\s([{])#([a-z0-9]+(?:-[a-z0-9]+)*)/gi, '$1<span class="journal-tag">#$2</span>');
}

export function entryPreview(body: string, title: string, max = 120): string {
	const fromTitle = title.trim();
	if (fromTitle) return fromTitle.slice(0, max);
	const plain = body
		.replace(/^#+\s+/gm, "")
		.replace(/[*_`#>-]/g, "")
		.replace(/\s+/g, " ")
		.trim();
	if (!plain) return "Empty entry";
	return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain;
}
