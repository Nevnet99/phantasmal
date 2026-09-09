import fs from "node:fs";
import path from "node:path";
import {
	CURRENT_VAULT_VERSION,
	HABITS_DIRNAME,
	IDENTITY_DIRNAME,
	JOURNAL_DIRNAME,
	VAULT_META_FILENAME,
	isVaultMeta,
	type VaultMeta,
} from "./schema";

export type VaultHandle = {
	path: string;
	schemaVersion: number;
	meta: VaultMeta;
};

let openVault: VaultHandle | null = null;

export function getOpenVault(): VaultHandle | null {
	return openVault;
}

export function closeVault(): void {
	openVault = null;
}

export function metaPath(vaultDir: string): string {
	return path.join(vaultDir, VAULT_META_FILENAME);
}

/** Write JSON atomically so cloud syncers see complete files. */
export function writeJsonAtomic(filePath: string, value: unknown): void {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	const tempPath = `${filePath}.${process.pid}.tmp`;
	fs.writeFileSync(tempPath, `${JSON.stringify(value, null, "\t")}\n`, "utf8");
	fs.renameSync(tempPath, filePath);
}

export function readVaultMeta(vaultDir: string): VaultMeta {
	const filePath = metaPath(vaultDir);
	const raw = fs.readFileSync(filePath, "utf8");
	const parsed: unknown = JSON.parse(raw);
	if (!isVaultMeta(parsed)) {
		throw new Error(`Invalid ${VAULT_META_FILENAME} in vault.`);
	}
	return parsed;
}

export function ensureVaultLayout(vaultDir: string): VaultMeta {
	fs.mkdirSync(vaultDir, { recursive: true });
	fs.mkdirSync(path.join(vaultDir, HABITS_DIRNAME), { recursive: true });
	fs.mkdirSync(path.join(vaultDir, JOURNAL_DIRNAME), { recursive: true });
	fs.mkdirSync(path.join(vaultDir, IDENTITY_DIRNAME), { recursive: true });

	const filePath = metaPath(vaultDir);
	if (!fs.existsSync(filePath)) {
		const meta: VaultMeta = {
			app: "phantasmal",
			version: CURRENT_VAULT_VERSION,
			createdAt: new Date().toISOString(),
		};
		writeJsonAtomic(filePath, meta);
		return meta;
	}

	const meta = readVaultMeta(vaultDir);
	if (meta.version > CURRENT_VAULT_VERSION) {
		throw new Error(
			`Vault schema v${meta.version} is newer than this app (v${CURRENT_VAULT_VERSION}). Update Phantasmal.`,
		);
	}

	if (meta.version < CURRENT_VAULT_VERSION) {
		const upgraded: VaultMeta = { ...meta, version: CURRENT_VAULT_VERSION };
		writeJsonAtomic(filePath, upgraded);
		return upgraded;
	}

	return meta;
}

export function openVaultAt(vaultDir: string): VaultHandle {
	const meta = ensureVaultLayout(vaultDir);
	openVault = {
		path: vaultDir,
		schemaVersion: meta.version,
		meta,
	};
	return openVault;
}

export function looksLikeVault(vaultDir: string): boolean {
	return fs.existsSync(metaPath(vaultDir));
}
