/** Inline habit hashtag node for the journal markdown editor. */

import { Node, mergeAttributes } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type Transaction } from "@tiptap/pm/state";

export type HabitTagOption = {
	tag: string;
	name: string;
	color: string;
	archived?: boolean;
};

export type HabitTagStorage = {
	getHabits: () => HabitTagOption[];
};

declare module "@tiptap/core" {
	interface Storage {
		habitTag: HabitTagStorage;
	}
}

const habitTagPluginKey = new PluginKey("habitTagAuto");

function activeHabits(getHabits: () => HabitTagOption[]): Map<string, HabitTagOption> {
	const map = new Map<string, HabitTagOption>();
	for (const habit of getHabits()) {
		if (habit.archived) continue;
		map.set(habit.tag.toLowerCase(), habit);
	}
	return map;
}

function isTagBoundary(char: string | undefined): boolean {
	return !char || /[\s([{]/.test(char);
}

function isTagDelimiter(char: string): boolean {
	return /^[\s.,!?;:)\]]$/.test(char);
}

/** Turn plain `#slug` text into habitTag nodes where the slug matches a habit. */
export function upgradeHabitTags(editor: Editor): void {
	const getHabits = editor.storage.habitTag?.getHabits;
	if (!getHabits) return;
	const byTag = activeHabits(getHabits);
	if (byTag.size === 0) return;

	const replacements: { from: number; to: number; tag: string }[] = [];
	editor.state.doc.descendants((node, pos) => {
		if (!node.isText || !node.text) return;
		const text = node.text;
		const re = /#([a-z0-9]+(?:-[a-z0-9]+)*)/gi;
		let match: RegExpExecArray | null;
		while ((match = re.exec(text))) {
			const slug = match[1]?.toLowerCase();
			if (!slug || !byTag.has(slug)) continue;
			const index = match.index ?? -1;
			if (index < 0) continue;
			const from = pos + index;
			const before =
				from > 0 ? editor.state.doc.textBetween(Math.max(0, from - 1), from, "\n", "\n") : "";
			if (before && !isTagBoundary(before)) continue;
			const afterPos = from + match[0].length;
			const after =
				afterPos < editor.state.doc.content.size
					? editor.state.doc.textBetween(
							afterPos,
							Math.min(afterPos + 1, editor.state.doc.content.size),
							"\n",
							"\n",
						)
					: "";
			// Skip in-progress tokens like `#walk` while typing `#walking`.
			if (after && !isTagDelimiter(after)) continue;
			replacements.push({ from, to: afterPos, tag: slug });
		}
	});

	if (replacements.length === 0) return;

	let tr: Transaction | null = null;
	for (const item of [...replacements].reverse()) {
		const habit = byTag.get(item.tag);
		if (!habit) continue;
		const type = editor.schema.nodes.habitTag;
		if (!type) return;
		const node = type.create({
			tag: habit.tag,
			name: habit.name,
			color: habit.color,
		});
		tr = (tr ?? editor.state.tr).replaceWith(item.from, item.to, node);
	}
	if (tr) {
		editor.view.dispatch(tr);
	}
}

export const HabitTag = Node.create({
	name: "habitTag",
	group: "inline",
	inline: true,
	atom: true,
	selectable: true,
	draggable: true,

	addOptions() {
		return {
			getHabits: (): HabitTagOption[] => [],
		};
	},

	addAttributes() {
		return {
			tag: { default: null, parseHTML: (el) => el.getAttribute("data-habit-tag") },
			name: { default: null, parseHTML: (el) => el.getAttribute("data-habit-name") },
			color: { default: null, parseHTML: (el) => el.getAttribute("data-habit-color") },
		};
	},

	parseHTML() {
		return [{ tag: "span[data-habit-tag]" }];
	},

	renderHTML({ node, HTMLAttributes }) {
		const tag = String(node.attrs.tag ?? "");
		return [
			"span",
			mergeAttributes(HTMLAttributes, {
				"data-habit-tag": tag,
				"data-habit-name": node.attrs.name ?? "",
				"data-habit-color": node.attrs.color ?? "",
				class: "journal-inline-tag",
				style: node.attrs.color ? `--habit-color: ${node.attrs.color}` : undefined,
			}),
			`#${tag}`,
		];
	},

	renderText({ node }) {
		return `#${String(node.attrs.tag ?? "")}`;
	},

	addStorage() {
		return {
			getHabits: this.options.getHabits,
			markdown: {
				serialize(state: { write: (text: string) => void }, node: ProseMirrorNode) {
					state.write(`#${String(node.attrs.tag ?? "")}`);
				},
			},
		};
	},

	addNodeView() {
		return ({ node, getPos, editor }) => {
			let current = node;
			const dom = document.createElement("span");
			dom.className = "journal-inline-tag";
			dom.contentEditable = "false";
			dom.dataset.habitTag = String(current.attrs.tag ?? "");
			if (current.attrs.color) {
				dom.style.setProperty("--habit-color", String(current.attrs.color));
			}

			const label = document.createElement("span");
			label.className = "journal-inline-tag__label";
			label.textContent = `#${String(current.attrs.tag ?? "")}`;

			const remove = document.createElement("button");
			remove.type = "button";
			remove.className = "journal-inline-tag__remove";
			remove.tabIndex = -1;
			remove.setAttribute(
				"aria-label",
				`Remove ${String(current.attrs.name || current.attrs.tag || "tag")}`,
			);
			remove.textContent = "×";

			const removeNode = () => {
				const pos = getPos();
				if (typeof pos !== "number") return;
				editor
					.chain()
					.focus()
					.deleteRange({ from: pos, to: pos + current.nodeSize })
					.run();
			};

			remove.addEventListener("mousedown", (event) => {
				event.preventDefault();
				event.stopPropagation();
			});
			remove.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				removeNode();
			});

			dom.append(label, remove);
			return {
				dom,
				selectNode: () => {
					dom.classList.add("journal-inline-tag--selected");
				},
				deselectNode: () => {
					dom.classList.remove("journal-inline-tag--selected");
				},
				update: (updated: ProseMirrorNode) => {
					if (updated.type.name !== "habitTag") return false;
					current = updated;
					label.textContent = `#${String(updated.attrs.tag ?? "")}`;
					dom.dataset.habitTag = String(updated.attrs.tag ?? "");
					if (updated.attrs.color) {
						dom.style.setProperty("--habit-color", String(updated.attrs.color));
					}
					remove.setAttribute(
						"aria-label",
						`Remove ${String(updated.attrs.name || updated.attrs.tag || "tag")}`,
					);
					return true;
				},
			};
		};
	},

	addProseMirrorPlugins() {
		const getHabits = () => this.storage.getHabits?.() ?? this.options.getHabits();
		return [
			new Plugin({
				key: habitTagPluginKey,
				props: {
					handleTextInput(view, from, to, text) {
						const byTag = activeHabits(getHabits);
						if (byTag.size === 0) return false;

						const type = view.state.schema.nodes.habitTag;
						if (!type) return false;

						const $from = view.state.doc.resolve(from);
						const parentStart = from - $from.parentOffset;
						const before = view.state.doc.textBetween(
							Math.max(parentStart, from - 80),
							from,
							"\n",
							"\n",
						);

						const commit = (slug: string, tagFrom: number, insertAfter: string) => {
							const habit = byTag.get(slug);
							if (!habit) return false;
							const tagNode = type.create({
								tag: habit.tag,
								name: habit.name,
								color: habit.color,
							});
							const tr = view.state.tr;
							if (from !== to) tr.delete(from, to);
							tr.replaceWith(tagFrom, from, tagNode);
							if (insertAfter) {
								tr.insertText(insertAfter, tagFrom + tagNode.nodeSize);
							}
							view.dispatch(tr);
							return true;
						};

						if (isTagDelimiter(text)) {
							const match = /(?:^|[\s([{])#([a-z0-9]+(?:-[a-z0-9]*))$/i.exec(before);
							if (!match?.[1]) return false;
							const slug = match[1].toLowerCase();
							if (!byTag.has(slug)) return false;
							return commit(slug, from - (slug.length + 1), text);
						}

						// Convert as soon as a unique full slug is completed (no trailing space needed).
						if (!/^[a-z0-9-]$/i.test(text)) return false;
						const candidate = `${before}${text}`;
						const match = /(?:^|[\s([{])#([a-z0-9]+(?:-[a-z0-9]*))$/i.exec(candidate);
						if (!match?.[1]) return false;
						const slug = match[1].toLowerCase();
						if (!byTag.has(slug)) return false;
						for (const tag of byTag.keys()) {
							if (tag !== slug && tag.startsWith(slug)) return false;
						}
						// `text` is the last character of the slug and is not in the doc yet.
						const tagFrom = from - (slug.length + 1 - text.length);
						return commit(slug, tagFrom, "");
					},
					handleKeyDown(view, event) {
						const { $from, empty } = view.state.selection;
						if (!empty) return false;

						if (event.key === "Backspace") {
							const before = $from.nodeBefore;
							if (before?.type.name === "habitTag") {
								view.dispatch(view.state.tr.delete($from.pos - before.nodeSize, $from.pos));
								return true;
							}
						}

						if (event.key === "Delete") {
							const after = $from.nodeAfter;
							if (after?.type.name === "habitTag") {
								view.dispatch(view.state.tr.delete($from.pos, $from.pos + after.nodeSize));
								return true;
							}
						}

						if (event.key === " " || event.key === "Enter") {
							const byTag = activeHabits(getHabits);
							if (byTag.size === 0) return false;
							const type = view.state.schema.nodes.habitTag;
							if (!type) return false;
							const parentStart = $from.pos - $from.parentOffset;
							const before = view.state.doc.textBetween(
								Math.max(parentStart, $from.pos - 80),
								$from.pos,
								"\n",
								"\n",
							);
							const match = /(?:^|[\s([{])#([a-z0-9]+(?:-[a-z0-9]*))$/i.exec(before);
							if (!match?.[1]) return false;
							const slug = match[1].toLowerCase();
							const habit = byTag.get(slug);
							if (!habit) return false;
							const tagFrom = $from.pos - (slug.length + 1);
							const tagNode = type.create({
								tag: habit.tag,
								name: habit.name,
								color: habit.color,
							});
							const tr = view.state.tr.replaceWith(tagFrom, $from.pos, tagNode);
							if (event.key === " ") {
								tr.insertText(" ", tagFrom + tagNode.nodeSize);
								view.dispatch(tr);
								return true;
							}
							view.dispatch(tr);
							return false;
						}

						return false;
					},
				},
			}),
		];
	},
});
