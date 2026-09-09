import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { closeVault, getOpenVault, looksLikeVault, openVaultAt, writeJsonAtomic } from "./fs-vault";
import {
	CURRENT_VAULT_VERSION,
	BREAKS_DIRNAME,
	HABITS_DIRNAME,
	IDENTITY_DIRNAME,
	JOURNAL_DIRNAME,
	VAULT_META_FILENAME,
} from "./schema";

const tempDirs: string[] = [];

afterEach(() => {
	closeVault();
	for (const dir of tempDirs.splice(0)) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
});

function tempVaultDir(): string {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), "phantasmal-vault-"));
	tempDirs.push(dir);
	return dir;
}

describe("fs vault", () => {
	it("creates layout and meta for a new folder", () => {
		const vaultDir = tempVaultDir();
		const handle = openVaultAt(vaultDir);

		expect(handle.schemaVersion).toBe(CURRENT_VAULT_VERSION);
		expect(fs.existsSync(path.join(vaultDir, VAULT_META_FILENAME))).toBe(true);
		expect(fs.existsSync(path.join(vaultDir, HABITS_DIRNAME))).toBe(true);
		expect(fs.existsSync(path.join(vaultDir, JOURNAL_DIRNAME))).toBe(true);
		expect(fs.existsSync(path.join(vaultDir, IDENTITY_DIRNAME))).toBe(true);
		expect(fs.existsSync(path.join(vaultDir, BREAKS_DIRNAME))).toBe(true);
		expect(getOpenVault()?.path).toBe(vaultDir);
		expect(looksLikeVault(vaultDir)).toBe(true);
	});

	it("reopens an existing vault without rewriting version", () => {
		const vaultDir = tempVaultDir();
		openVaultAt(vaultDir);
		closeVault();

		const again = openVaultAt(vaultDir);
		expect(again.schemaVersion).toBe(CURRENT_VAULT_VERSION);
		expect(again.meta.app).toBe("phantasmal");
	});

	it("writeJsonAtomic leaves a complete file after rename", () => {
		const vaultDir = tempVaultDir();
		const filePath = path.join(vaultDir, "note.json");
		writeJsonAtomic(filePath, { ok: true });
		expect(JSON.parse(fs.readFileSync(filePath, "utf8"))).toEqual({ ok: true });
	});
});
