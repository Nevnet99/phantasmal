import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";
import { LATEST_SCHEMA_VERSION } from "./migrations";
import { closeVault, getOpenVault, openVaultAt, runMigrations } from "./vault";

const require = createRequire(import.meta.url);
const BetterSqlite3 = require("better-sqlite3") as typeof import("better-sqlite3");

const tempDirs: string[] = [];

afterEach(() => {
	closeVault();
	for (const dir of tempDirs.splice(0)) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

function tempDb(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "phantasmal-vault-"));
	tempDirs.push(dir);
	return path.join(dir, "phantasmal.db");
}

describe("vault", () => {
	it("creates a database, applies migrations, and reports schema version", () => {
		const dbPath = tempDb();
		const handle = openVaultAt(dbPath);

		expect(fs.existsSync(dbPath)).toBe(true);
		expect(handle.schemaVersion).toBe(LATEST_SCHEMA_VERSION);
		expect(getOpenVault()?.path).toBe(dbPath);

		const app = handle.db.prepare("SELECT value FROM meta WHERE key = ?").get("app") as {
			value: string;
		};
		expect(app.value).toBe("phantasmal");
	});

	it("is idempotent when opening an existing vault", () => {
		const dbPath = tempDb();
		openVaultAt(dbPath);
		closeVault();

		const again = openVaultAt(dbPath);
		expect(again.schemaVersion).toBe(LATEST_SCHEMA_VERSION);

		const count = again.db.prepare("SELECT COUNT(*) AS n FROM schema_migrations").get() as {
			n: number;
		};
		expect(count.n).toBe(LATEST_SCHEMA_VERSION);
	});

	it("runMigrations alone advances an empty connection", () => {
		const dbPath = tempDb();
		const db = new BetterSqlite3(dbPath);
		const version = runMigrations(db);
		expect(version).toBe(LATEST_SCHEMA_VERSION);
		db.close();
	});
});
