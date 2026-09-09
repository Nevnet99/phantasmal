import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import { HabitTag, upgradeHabitTags, type HabitTagOption } from "./habit-tag-extension";

export type DsMarkdownTagQueryDetail = {
	open: boolean;
	query: string;
};

export type DsMarkdownChangeDetail = {
	value: string;
};

/**
 * Notion-style markdown surface: markdown input rules style live while typing.
 * Stores/emits markdown. Dispatches `ds-change` and `ds-tag-query`.
 * Known `#habit-slug` tokens become inline removable tags.
 */
@customElement("ds-markdown-editor")
export class DsMarkdownEditor extends LitElement {
	@property({ type: String })
	value = "";

	@property({ type: String })
	placeholder = "Start writing…";

	@property({ attribute: false })
	habits: HabitTagOption[] = [];

	private editor: Editor | null = null;
	private applyingExternal = false;

	/** Prefer light DOM so journal typography tokens apply. */
	protected createRenderRoot(): HTMLElement | DocumentFragment {
		return this;
	}

	connectedCallback(): void {
		super.connectedCallback();
		this.classList.add("ds-markdown-editor");
	}

	protected firstUpdated(): void {
		const host = this.querySelector(".ds-markdown-editor__surface");
		if (!(host instanceof HTMLElement)) return;

		this.editor = new Editor({
			element: host,
			extensions: [
				StarterKit.configure({
					heading: { levels: [1, 2, 3] },
				}),
				Placeholder.configure({
					placeholder: () => this.placeholder,
				}),
				HabitTag.configure({
					getHabits: () => this.habits,
				}),
				Markdown.configure({
					html: false,
					breaks: true,
					transformPastedText: true,
					transformCopiedText: true,
				}),
			],
			content: this.value || "",
			editorProps: {
				attributes: {
					class: "ds-markdown-editor__prose",
					role: "textbox",
					"aria-multiline": "true",
					"aria-label": "Journal entry",
				},
			},
			onUpdate: ({ editor }) => {
				if (this.applyingExternal) return;
				const markdown = this.readMarkdown(editor);
				this.dispatchEvent(
					new CustomEvent<DsMarkdownChangeDetail>("ds-change", {
						detail: { value: markdown },
						bubbles: true,
						composed: true,
					}),
				);
				this.emitTagQuery(editor);
			},
			onSelectionUpdate: ({ editor }) => {
				this.emitTagQuery(editor);
			},
			onCreate: ({ editor }) => {
				this.applyingExternal = true;
				upgradeHabitTags(editor);
				this.applyingExternal = false;
			},
		});
	}

	protected updated(changed: Map<string, unknown>): void {
		if (!this.editor) return;
		if (changed.has("placeholder")) {
			this.editor.view.dispatch(this.editor.state.tr);
		}
		if (changed.has("habits")) {
			this.editor.storage.habitTag.getHabits = () => this.habits;
			this.applyingExternal = true;
			upgradeHabitTags(this.editor);
			this.applyingExternal = false;
		}
		if (changed.has("value")) {
			const current = this.readMarkdown(this.editor);
			if (this.value === current) return;
			this.applyingExternal = true;
			this.editor.commands.setContent(this.value || "");
			upgradeHabitTags(this.editor);
			this.applyingExternal = false;
		}
	}

	disconnectedCallback(): void {
		this.editor?.destroy();
		this.editor = null;
		super.disconnectedCallback();
	}

	/** Replace a partial `#query` before the caret with an inline habit tag. */
	insertHashtag(tag: string): void {
		const editor = this.editor;
		if (!editor) return;
		const habit = this.habits.find(
			(item) => !item.archived && item.tag.toLowerCase() === tag.toLowerCase(),
		);
		const { from } = editor.state.selection;
		const textBefore = editor.state.doc.textBetween(Math.max(0, from - 64), from, "\n", "\n");
		const match = /(?:^|[\s([{])#([a-z0-9-]*)$/i.exec(textBefore);
		const chain = editor.chain().focus();
		if (match) {
			const token = `#${match[1] ?? ""}`;
			const deleteFrom = from - token.length;
			chain.deleteRange({ from: Math.max(0, deleteFrom), to: from });
		}
		if (habit) {
			chain
				.insertContent([
					{
						type: "habitTag",
						attrs: { tag: habit.tag, name: habit.name, color: habit.color },
					},
					{ type: "text", text: " " },
				])
				.run();
			return;
		}
		chain.insertContent(`#${tag} `).run();
	}

	focusEditor(): void {
		this.editor?.commands.focus("end");
	}

	private readMarkdown(editor: Editor): string {
		const storage = editor.storage as { markdown?: { getMarkdown?: () => string } };
		return storage.markdown?.getMarkdown?.() ?? "";
	}

	private emitTagQuery(editor: Editor): void {
		const { from } = editor.state.selection;
		const textBefore = editor.state.doc.textBetween(Math.max(0, from - 64), from, "\n", "\n");
		const match = /(?:^|[\s([{])#([a-z0-9-]*)$/i.exec(textBefore);
		const detail: DsMarkdownTagQueryDetail = match
			? { open: true, query: match[1] ?? "" }
			: { open: false, query: "" };
		this.dispatchEvent(
			new CustomEvent<DsMarkdownTagQueryDetail>("ds-tag-query", {
				detail,
				bubbles: true,
				composed: true,
			}),
		);
	}

	render() {
		return html`<div class="ds-markdown-editor__surface"></div>`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"ds-markdown-editor": DsMarkdownEditor;
	}
}
