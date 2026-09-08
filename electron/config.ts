import fs from "node:fs";
import path from "node:path";

export type AppConfig = {
	/** Absolute path to the SQLite database file. */
	vaultPath: string | null;
};

const DEFAULT_CONFIG: AppConfig = {
	vaultPath: null,
};

export function defaultVaultPath(documentsDir: string): string {
	return path.join(documentsDir, "Phantasmal", "phantasmal.db");
}

export function configFilePath(userDataDir: string): string {
	return path.join(userDataDir, "config.json");
}

export function readConfig(userDataDir: string): AppConfig {
	const filePath = configFilePath(userDataDir);
	if (!fs.existsSync(filePath)) {
		return { ...DEFAULT_CONFIG };
	}

	try {
		const raw = fs.readFileSync(filePath, "utf8");
		const parsed = JSON.parse(raw) as Partial<AppConfig>;
		return {
			vaultPath: typeof parsed.vaultPath === "string" ? parsed.vaultPath : null,
		};
	} catch {
		return { ...DEFAULT_CONFIG };
	}
}

export function writeConfig(userDataDir: string, config: AppConfig): void {
	fs.mkdirSync(userDataDir, { recursive: true });
	fs.writeFileSync(configFilePath(userDataDir), `${JSON.stringify(config, null, "\t")}\n`, "utf8");
}

export function setVaultPath(userDataDir: string, vaultPath: string): AppConfig {
	const next: AppConfig = { vaultPath };
	writeConfig(userDataDir, next);
	return next;
}
