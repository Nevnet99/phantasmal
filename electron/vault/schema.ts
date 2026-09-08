export const VAULT_META_FILENAME = "phantasmal.json";
export const HABITS_DIRNAME = "habits";
export const JOURNAL_DIRNAME = "journal";

export const CURRENT_VAULT_VERSION = 1;

export type VaultMeta = {
	app: "phantasmal";
	version: number;
	createdAt: string;
};

export function isVaultMeta(value: unknown): value is VaultMeta {
	if (!value || typeof value !== "object") {
		return false;
	}
	const record = value as Record<string, unknown>;
	return (
		record.app === "phantasmal" &&
		typeof record.version === "number" &&
		typeof record.createdAt === "string"
	);
}
