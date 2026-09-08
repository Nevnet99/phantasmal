import type { VaultStatus } from "@/shared/vault";

export type AppScreen = "loading" | "welcome" | "setup" | "app";

type PhantasmalApp = {
	screen: AppScreen;
	status: VaultStatus | null;
	busy: boolean;
	init(): Promise<void>;
	startSetup(): void;
	setupLocally(): Promise<void>;
	enterApp(): void;
	chooseFolder(): Promise<void>;
	openExisting(): Promise<void>;
	useDefault(): Promise<void>;
	reveal(): Promise<void>;
	run(action: () => Promise<VaultStatus>): Promise<void>;
};

function unavailableStatus(): VaultStatus {
	return {
		configured: false,
		path: null,
		open: false,
		schemaVersion: null,
		defaultPath: "(unavailable outside Electron)",
		error: "Vault API is only available in the Electron app.",
	};
}

export function phantasmalApp(): PhantasmalApp {
	return {
		screen: "loading",
		status: null,
		busy: false,

		async init() {
			const api = window.phantasmal?.vault;
			if (!api) {
				this.status = unavailableStatus();
				this.screen = "welcome";
				return;
			}

			this.status = await api.getStatus();
			this.screen = this.status.open ? "app" : "welcome";
		},

		startSetup() {
			this.screen = "setup";
		},

		async setupLocally() {
			const api = window.phantasmal?.vault;
			if (!api) return;
			this.busy = true;
			try {
				this.status = await api.useDefaultLocation();
				if (this.status.open) {
					this.screen = "app";
				}
			} finally {
				this.busy = false;
			}
		},

		enterApp() {
			if (this.status?.open) {
				this.screen = "app";
			}
		},

		async run(action) {
			this.busy = true;
			try {
				this.status = await action();
			} finally {
				this.busy = false;
			}
		},

		async chooseFolder() {
			const api = window.phantasmal?.vault;
			if (!api) return;
			await this.run(() => api.chooseFolder());
		},

		async openExisting() {
			const api = window.phantasmal?.vault;
			if (!api) return;
			await this.run(() => api.openExistingVault());
		},

		async useDefault() {
			const api = window.phantasmal?.vault;
			if (!api) return;
			await this.run(() => api.useDefaultLocation());
		},

		async reveal() {
			await window.phantasmal?.vault.revealInFolder();
		},
	};
}
