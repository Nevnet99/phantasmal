import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

export type DsIconSize = "sm" | "md" | "lg";

/**
 * Material Symbols Outlined icon.
 * `name` is the symbol ligature (e.g. "calendar_month", "grid_view").
 */
@customElement("ds-icon")
export class DsIcon extends LitElement {
	@property({ type: String, reflect: true })
	name = "help";

	@property({ type: String, reflect: true })
	size: DsIconSize = "md";

	/** Optical weight 100–700. */
	@property({ type: Number, reflect: true })
	weight = 400;

	/** Accessible name. Omit for decorative icons (aria-hidden). */
	@property({ type: String })
	label = "";

	static styles = css`
		:host {
			display: inline-grid;
			place-items: center;
			place-content: center;
			line-height: 0;
			color: inherit;
			vertical-align: middle;
			flex-shrink: 0;
		}

		:host([size="sm"]) {
			--ds-icon-size: 1.125rem;
		}

		:host([size="md"]) {
			--ds-icon-size: 1.35rem;
		}

		:host([size="lg"]) {
			--ds-icon-size: 1.75rem;
		}

		.icon {
			font-family: "Material Symbols Outlined Variable", "Material Symbols Outlined";
			font-weight: 400;
			font-style: normal;
			font-size: var(--ds-icon-size, 1.35rem);
			line-height: 1;
			width: 1em;
			height: 1em;
			letter-spacing: normal;
			text-transform: none;
			display: grid;
			place-items: center;
			white-space: nowrap;
			word-wrap: normal;
			direction: ltr;
			overflow: hidden;
			-webkit-font-smoothing: antialiased;
			-webkit-font-feature-settings: "liga";
			font-feature-settings: "liga";
			user-select: none;
		}

		:host([weight="100"]) .icon {
			font-weight: 100;
		}
		:host([weight="200"]) .icon {
			font-weight: 200;
		}
		:host([weight="300"]) .icon {
			font-weight: 300;
		}
		:host([weight="500"]) .icon {
			font-weight: 500;
		}
		:host([weight="600"]) .icon {
			font-weight: 600;
		}
		:host([weight="700"]) .icon {
			font-weight: 700;
		}
	`;

	render() {
		const labelled = this.label.trim().length > 0;
		return html`
			<span
				class="icon"
				aria-hidden=${labelled ? nothing : "true"}
				aria-label=${labelled ? this.label : nothing}
				role=${labelled ? "img" : nothing}
			>
				${this.name}
			</span>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"ds-icon": DsIcon;
	}
}
