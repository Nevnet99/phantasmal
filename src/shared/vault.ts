/** Shared vault types and IPC channel names (renderer + preload + main). */

export const VAULT_CHANNELS = {
	getStatus: "vault:getStatus",
	chooseFolder: "vault:chooseFolder",
	openExistingVault: "vault:openExistingVault",
	useDefaultLocation: "vault:useDefaultLocation",
	revealInFolder: "vault:revealInFolder",
} as const;

export type VaultStatus = {
	configured: boolean;
	path: string | null;
	open: boolean;
	schemaVersion: number | null;
	defaultPath: string;
	error: string | null;
};

export type VaultApi = {
	getStatus: () => Promise<VaultStatus>;
	chooseFolder: () => Promise<VaultStatus>;
	openExistingVault: () => Promise<VaultStatus>;
	useDefaultLocation: () => Promise<VaultStatus>;
	revealInFolder: () => Promise<boolean>;
};
