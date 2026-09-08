import type { VaultStatus } from "@/shared/vault";

export type AppScreen = "loading" | "welcome" | "setup" | "app";

type PhantasmalApp = {
	screen: AppScreen;
	status: VaultStatus | null;
	busy: boolean;
	get isLoading(): boolean;
	get isWelcome(): boolean;
	get isSetup(): boolean;
	get isApp(): boolean;
	get defaultPathLabel(): string;
	get readyLabel(): string;
	get errorLabel(): string;
	get showReady(): boolean;
	get showError(): boolean;
	get vaultPathLabel(): string;
	init(): Promise<void>;
	startSetup(): void;
	setupLocally(): Promise<void>;
	enterApp(): void;
	chooseFolder(): Promise<void>;
	openExisting(): Promise<void>;
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

		get isLoading() {
			return this.screen === "loading";
		},

		get isWelcome() {
			return this.screen === "welcome";
		},

		get isSetup() {
			return this.screen === "setup";
		},

		get isApp() {
			return this.screen === "app";
		},

		get defaultPathLabel() {
			return this.status?.defaultPath ?? "Documents/Phantasmal";
		},

		get readyLabel() {
			return this.status?.path ? `Ready · ${this.status.path}` : "";
		},

		get errorLabel() {
			return this.status?.error ?? "";
		},

		get showReady() {
			return Boolean(this.status?.open && this.status.schemaVersion !== null);
		},

		get showError() {
			return Boolean(this.status?.error);
		},

		get vaultPathLabel() {
			return this.status?.path ?? "";
		},

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

		async reveal() {
			await window.phantasmal?.vault.revealInFolder();
		},
	};
}
