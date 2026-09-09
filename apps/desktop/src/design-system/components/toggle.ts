import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import "./icon";

export type DsToggleOption = {
	value: string;
	icon: string;
	label: string;
};

/**
 * Two-option icon toggle with a sliding thumb.
 *
 * Prefer light-DOM children so icons/fonts stay outside nested shadow roots:
 *
 * ```html
 * <ds-toggle value="graph" aria-label="View" @ds-change="...">
 *   <button type="button" data-value="graph" title="Graph" aria-label="Graph">
 *     <ds-icon name="grid_view" size="sm"></ds-icon>
 *   </button>
 *   <button type="button" data-value="calendar" title="Calendar" aria-label="Calendar">
 *     <ds-icon name="calendar_month" size="sm"></ds-icon>
 *   </button>
 * </ds-toggle>
 * ```
 *
 * Dispatches `ds-change` with `detail: { value }`.
 */
@customElement("ds-toggle")
export class DsToggle extends LitElement {
	@property({ type: String, reflect: true })
	value = "";

	static styles = css`
		:host {
			--ds-toggle-pad: 2px;
			display: inline-grid;
			grid-template-columns: 1fr 1fr;
			align-items: stretch;
			justify-items: stretch;
			position: relative;
			isolation: isolate;
			box-sizing: border-box;
			border: 1px solid var(--color-line);
			border-radius: var(--radius-sm);
			background: color-mix(in srgb, var(--color-ground) 92%, var(--color-ink));
			padding: var(--ds-toggle-pad);
		}

		.thumb {
			position: absolute;
			top: var(--ds-toggle-pad);
			bottom: var(--ds-toggle-pad);
			left: var(--ds-toggle-pad);
			width: calc((100% - 2 * var(--ds-toggle-pad)) / 2);
			border-radius: var(--radius-sm);
			background: color-mix(in srgb, var(--color-accent) 22%, transparent);
			border: 1px solid color-mix(in srgb, var(--color-accent) 45%, var(--color-line));
			box-sizing: border-box;
			transition: left 160ms cubic-bezier(0.2, 0, 0, 1);
			pointer-events: none;
			z-index: 0;
		}

		:host([data-index="1"]) .thumb {
			left: calc(var(--ds-toggle-pad) + (100% - 2 * var(--ds-toggle-pad)) / 2);
		}

		slot {
			display: contents;
		}

		::slotted(button) {
			appearance: none;
			position: relative;
			z-index: 1;
			box-sizing: border-box;
			display: grid;
			place-items: center;
			place-content: center;
			width: auto;
			min-width: 2.25rem;
			min-height: 2.25rem;
			margin: 0;
			padding: 0;
			border: 0;
			background: transparent;
			color: var(--color-muted);
			line-height: 0;
			cursor: pointer;
		}

		::slotted(button[aria-pressed="true"]) {
			color: var(--color-ink);
		}

		::slotted(button:focus-visible) {
			outline: 2px solid var(--color-accent);
			outline-offset: 2px;
		}

		@media (prefers-reduced-motion: reduce) {
			.thumb {
				transition: none;
			}
		}
	`;

	private onClick(event: Event): void {
		const path = event.composedPath();
		const button = path.find(
			(node): node is HTMLButtonElement =>
				node instanceof HTMLButtonElement && node.hasAttribute("data-value"),
		);
		if (!button) return;
		const next = button.dataset.value;
		if (!next || next === this.value) return;
		this.value = next;
		this.syncPressed();
		this.dispatchEvent(
			new CustomEvent("ds-change", {
				detail: { value: next },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private optionButtons(): HTMLButtonElement[] {
		return [...this.querySelectorAll<HTMLButtonElement>(":scope > button[data-value]")];
	}

	private syncPressed(): void {
		const buttons = this.optionButtons();
		buttons.forEach((button, index) => {
			const on = button.dataset.value === this.value;
			button.setAttribute("aria-pressed", on ? "true" : "false");
			if (on) this.dataset.index = String(index);
		});
		if (buttons.length > 0 && !buttons.some((button) => button.dataset.value === this.value)) {
			this.dataset.index = "0";
		}
	}

	protected firstUpdated(): void {
		this.syncPressed();
	}

	protected updated(): void {
		this.syncPressed();
	}

	render() {
		return html`
			<span class="thumb" aria-hidden="true"></span>
			<slot @click=${this.onClick}></slot>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"ds-toggle": DsToggle;
	}
}
