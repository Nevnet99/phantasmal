import { LitElement, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";

export type DsColorChangeDetail = {
	value: string;
};

/**
 * Compact color control that opens the native OS color picker.
 *
 * ```html
 * <ds-color-picker value="#5b8c5a" aria-label="Color" @ds-change="..."></ds-color-picker>
 * ```
 *
 * Dispatches `ds-change` with `detail: { value }` (#rrggbb).
 */
@customElement("ds-color-picker")
export class DsColorPicker extends LitElement {
	@property({ type: String, reflect: true })
	value = "#5b8c5a";

	@property({ type: Boolean, reflect: true })
	disabled = false;

	@query("input[type='color']")
	private input!: HTMLInputElement;

	static styles = css`
		:host {
			display: inline-block;
			max-width: 100%;
		}

		.control {
			appearance: none;
			display: inline-flex;
			align-items: center;
			gap: 0.55rem;
			min-height: var(--nav-min-height, 2.25rem);
			margin: 0;
			padding: 0.25rem 0.55rem 0.25rem 0.3rem;
			border: 1px solid var(--color-line);
			border-radius: var(--radius-sm);
			background: color-mix(in srgb, var(--color-ink) 3%, transparent);
			color: var(--color-ink);
			font: inherit;
			cursor: pointer;
		}

		.control:hover:not(:disabled) {
			border-color: color-mix(in srgb, var(--color-ink) 28%, var(--color-line));
			background: color-mix(in srgb, var(--color-ink) 6%, transparent);
		}

		.control:focus-visible {
			outline: 2px solid var(--color-accent);
			outline-offset: 2px;
		}

		.control:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		.swatch {
			box-sizing: border-box;
			width: 1.35rem;
			height: 1.35rem;
			border: 1px solid color-mix(in srgb, var(--color-ink) 25%, transparent);
			border-radius: var(--radius-sm);
			background: var(--ds-color, #5b8c5a);
			flex-shrink: 0;
		}

		.hex {
			font-family: var(--font-mono);
			font-size: 0.85rem;
			letter-spacing: 0.02em;
			text-transform: uppercase;
		}

		.caret {
			color: var(--color-muted);
			font-size: 0.85rem;
			line-height: 1;
		}

		.native {
			position: absolute;
			width: 1px;
			height: 1px;
			padding: 0;
			margin: -1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
			white-space: nowrap;
			border: 0;
			opacity: 0;
			pointer-events: none;
		}
	`;

	private normalizedValue(): string {
		const value = this.value?.trim() || "#5b8c5a";
		return /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : "#5b8c5a";
	}

	private openPicker(): void {
		if (this.disabled) return;
		const input = this.input;
		if (!input) return;
		if (typeof input.showPicker === "function") {
			try {
				input.showPicker();
				return;
			} catch {
				// Fall through for older Chromium builds.
			}
		}
		input.focus();
		input.click();
	}

	private onNativeInput(event: Event): void {
		const next = (event.target as HTMLInputElement).value.toLowerCase();
		if (next === this.normalizedValue()) return;
		this.value = next;
		this.dispatchEvent(
			new CustomEvent<DsColorChangeDetail>("ds-change", {
				detail: { value: next },
				bubbles: true,
				composed: true,
			}),
		);
	}

	render() {
		const color = this.normalizedValue();
		return html`
			<button
				type="button"
				class="control"
				style=${`--ds-color: ${color}`}
				?disabled=${this.disabled}
				aria-label=${this.getAttribute("aria-label") || "Choose color"}
				@click=${this.openPicker}
			>
				<span class="swatch" aria-hidden="true"></span>
				<span class="hex">${color}</span>
				<span class="caret" aria-hidden="true">▾</span>
			</button>
			<input
				class="native"
				type="color"
				tabindex="-1"
				aria-hidden="true"
				.value=${color}
				?disabled=${this.disabled}
				@input=${this.onNativeInput}
				@change=${this.onNativeInput}
			/>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"ds-color-picker": DsColorPicker;
	}
}
