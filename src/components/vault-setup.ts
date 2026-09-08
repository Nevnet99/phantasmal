import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import type { VaultStatus } from "@/shared/vault";

@customElement("vault-setup")
export class VaultSetup extends LitElement {
	@state()
	private status: VaultStatus | null = null;

	@state()
	private busy = false;

	static styles = css`
		:host {
			display: block;
		}

		.panel {
			display: grid;
			gap: var(--space-md);
		}

		.eyebrow {
			margin: 0;
			font-size: var(--text-caption);
			text-transform: uppercase;
			letter-spacing: 0.08em;
			color: var(--color-muted);
		}

		h2 {
			margin: 0;
			font-family: var(--font-display);
			font-size: 1.5rem;
			font-weight: 600;
			letter-spacing: -0.02em;
		}

		.lead {
			margin: 0;
			max-width: 36rem;
			color: var(--color-muted);
			font-size: 1rem;
			line-height: 1.5;
		}

		.path {
			margin: 0;
			padding: var(--space-sm) var(--space-md);
			border: 1px solid var(--color-line);
			border-radius: var(--radius-sm);
			font-family: ui-monospace, "Cascadia Code", monospace;
			font-size: 0.85rem;
			word-break: break-all;
			background: color-mix(in srgb, var(--color-ground) 92%, var(--color-ink));
		}

		.actions {
			display: flex;
			flex-wrap: wrap;
			gap: var(--space-sm);
		}

		button {
			appearance: none;
			border: 1px solid var(--color-line);
			border-radius: var(--radius-sm);
			padding: 0.55rem 0.9rem;
			background: transparent;
			color: var(--color-ink);
			font: inherit;
			font-size: 0.95rem;
			cursor: pointer;
		}

		button:hover:not(:disabled) {
			border-color: color-mix(in srgb, var(--color-ink) 35%, var(--color-line));
			background: color-mix(in srgb, var(--color-ground) 80%, var(--color-ink));
		}

		button.primary {
			border-color: var(--color-accent);
			background: color-mix(in srgb, var(--color-accent) 22%, transparent);
		}

		button:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		.error {
			margin: 0;
			color: #e8a090;
			font-size: 0.95rem;
		}

		.ok {
			margin: 0;
			color: var(--color-accent);
			font-size: 0.95rem;
		}
	`;

	connectedCallback() {
		super.connectedCallback();
		void this.refresh();
	}

	private async refresh() {
		const api = window.phantasmal?.vault;
		if (!api) {
			this.status = {
				configured: false,
				path: null,
				open: false,
				schemaVersion: null,
				defaultPath: "(unavailable outside Electron)",
				error: "Vault API is only available in the Electron app.",
			};
			return;
		}

		this.status = await api.getStatus();
	}

	private async run(action: () => Promise<VaultStatus>) {
		this.busy = true;
		try {
			this.status = await action();
		} finally {
			this.busy = false;
		}
	}

	private chooseFolder = () => {
		const api = window.phantasmal?.vault;
		if (!api) return;
		void this.run(() => api.chooseFolder());
	};

	private openFile = () => {
		const api = window.phantasmal?.vault;
		if (!api) return;
		void this.run(() => api.openDatabaseFile());
	};

	private useDefault = () => {
		const api = window.phantasmal?.vault;
		if (!api) return;
		void this.run(() => api.useDefaultLocation());
	};

	private reveal = async () => {
		await window.phantasmal?.vault.revealInFolder();
	};

	render() {
		const status = this.status;
		if (!status) {
			return html`<p class="eyebrow">Loading vault…</p>`;
		}

		return html`
			<div class="panel">
				<p class="eyebrow">Data vault</p>
				<h2>${status.open ? "Vault connected" : "Choose where habits live"}</h2>
				<p class="lead">
					Put the database in a Google Drive or Dropbox folder to share one vault across machines.
					Keep the app closed on one computer while the other writes.
				</p>

				${
					status.path
						? html`<p class="path" title="Vault database path">${status.path}</p>`
						: html`<p class="path">${status.defaultPath}</p>`
				}
				${
					status.open && status.schemaVersion !== null
						? html`<p class="ok">Open · schema v${status.schemaVersion}</p>`
						: nothing
				}
				${status.error ? html`<p class="error">${status.error}</p>` : nothing}

				<div class="actions">
					<button class="primary" ?disabled=${this.busy} @click=${this.chooseFolder}>
						Choose folder…
					</button>
					<button ?disabled=${this.busy} @click=${this.openFile}>Open .db file…</button>
					<button ?disabled=${this.busy} @click=${this.useDefault}>Use Documents/Phantasmal</button>
					${
						status.configured
							? html`<button ?disabled=${this.busy} @click=${this.reveal}>Show in folder</button>`
							: nothing
					}
				</div>
			</div>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"vault-setup": VaultSetup;
	}
}
