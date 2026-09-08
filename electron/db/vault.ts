import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import type Database from "better-sqlite3";
import { LATEST_SCHEMA_VERSION, MIGRATIONS } from "./migrations";

const require = createRequire(import.meta.url);
const BetterSqlite3 = require("better-sqlite3") as typeof import("better-sqlite3");

export type VaultHandle = {
	db: Database.Database;
	path: string;
	schemaVersion: number;
};

let openVault: VaultHandle | null = null;

export function getOpenVault(): VaultHandle | null {
	return openVault;
}

export function closeVault(): void {
	if (openVault) {
		openVault.db.close();
		openVault = null;
	}
}

export function ensureParentDir(dbPath: string): void {
	fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

export function runMigrations(db: Database.Database): number {
	db.exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY,
			name TEXT NOT NULL,
			applied_at TEXT NOT NULL
		);
	`);

	const applied = new Set(
		db
			.prepare("SELECT version FROM schema_migrations ORDER BY version")
			.all()
			.map((row) => (row as { version: number }).version),
	);

	const apply = db.transaction(() => {
		for (const migration of MIGRATIONS) {
			if (applied.has(migration.version)) {
				continue;
			}
			db.exec(migration.sql);
			db.prepare(
				"INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, datetime('now'))",
			).run(migration.version, migration.name);
		}
	});

	apply();

	const row = db.prepare("SELECT MAX(version) AS version FROM schema_migrations").get() as {
		version: number | null;
	};

	return row.version ?? LATEST_SCHEMA_VERSION;
}

export function openVaultAt(dbPath: string): VaultHandle {
	closeVault();
	ensureParentDir(dbPath);

	const db = new BetterSqlite3(dbPath);
	db.pragma("journal_mode = WAL");
	db.pragma("foreign_keys = ON");

	const schemaVersion = runMigrations(db);
	openVault = { db, path: dbPath, schemaVersion };
	return openVault;
}

export function readSchemaVersion(db: Database.Database): number | null {
	try {
		const row = db.prepare("SELECT MAX(version) AS version FROM schema_migrations").get() as
			{ version: number | null } | undefined;
		return row?.version ?? null;
	} catch {
		return null;
	}
}
