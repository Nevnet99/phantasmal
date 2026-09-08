import type { VaultStatus } from "@/shared/vault";

type VaultSetupData = {
	status: VaultStatus | null;
	busy: boolean;
	init(): Promise<void>;
	chooseFolder(): Promise<void>;
	openExisting(): Promise<void>;
	useDefault(): Promise<void>;
	reveal(): Promise<void>;
	run(action: () => Promise<VaultStatus>): Promise<void>;
};

export function vaultSetup(): VaultSetupData {
	return {
		status: null,
		busy: false,

		async init() {
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
