import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

export type DsButtonVariant = "default" | "primary";

@customElement("ds-button")
export class DsButton extends LitElement {
	@property({ type: String, reflect: true })
	variant: DsButtonVariant = "default";

	@property({ type: Boolean, reflect: true })
	disabled = false;

	static styles = css`
		:host {
			display: inline-block;
		}

		button {
			appearance: none;
			border: 1px solid var(--color-line);
			border-radius: var(--radius-sm);
			padding: var(--control-pad-y, 0.4rem) var(--control-pad-x, 0.7rem);
			background: transparent;
			color: var(--color-ink);
			font: inherit;
			font-size: 0.95rem;
			line-height: 1.2;
			cursor: pointer;
		}

		button:hover:not(:disabled) {
			border-color: color-mix(in srgb, var(--color-ink) 35%, var(--color-line));
			background: color-mix(in srgb, var(--color-ground) 80%, var(--color-ink));
		}

		:host([variant="primary"]) button {
			border-color: var(--color-accent);
			background: color-mix(in srgb, var(--color-accent) 22%, transparent);
		}

		button:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		button:focus-visible {
			outline: 2px solid var(--color-accent);
			outline-offset: 2px;
		}
	`;

	render() {
		return html`
			<button ?disabled=${this.disabled} part="button">
				<slot></slot>
			</button>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"ds-button": DsButton;
	}
}
