import { LitElement, css, html } from "lit";
import { customElement } from "lit/decorators.js";
import "./components/vault-setup";

@customElement("app-shell")
export class AppShell extends LitElement {
	static styles = css`
		:host {
			display: block;
			min-height: 100vh;
			color: var(--color-ink);
			background: var(--color-ground);
			font-family: var(--font-body);
		}

		.shell {
			min-height: 100vh;
			display: grid;
			grid-template-rows: auto 1fr;
			padding: var(--space-xl);
			box-sizing: border-box;
		}

		header {
			display: grid;
			gap: var(--space-xs);
			margin-bottom: var(--space-xl);
		}

		h1 {
			margin: 0;
			font-family: var(--font-display);
			font-size: var(--text-display);
			font-weight: 600;
			letter-spacing: -0.02em;
			line-height: 1.1;
		}

		p {
			margin: 0;
			max-width: 36rem;
			color: var(--color-muted);
			font-size: var(--text-body);
			line-height: 1.5;
		}

		.stage {
			border: 1px solid var(--color-line);
			border-radius: var(--radius-md);
			min-height: 18rem;
			padding: var(--space-lg);
			background: color-mix(in srgb, var(--color-ground) 88%, var(--color-ink));
		}
	`;

	render() {
		return html`
			<div class="shell">
				<header>
					<h1>Phantasmal</h1>
					<p>An Atomic Habits workspace for systems, streaks, and reflection.</p>
				</header>
				<section class="stage" aria-label="Workspace">
					<vault-setup></vault-setup>
				</section>
			</div>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"app-shell": AppShell;
	}
}
