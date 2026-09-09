import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type {
	IdentityDraft,
	IdentityHabitOption,
	IdentityRecord,
	IdentitySnapshot,
	IdentityView,
} from "../../src/shared/identity";
import {
	archivedDayLabel,
	buildEvidence,
	linkedLabel,
	periodLabel,
	tallyVotes,
	voteLabel,
} from "../../src/lib/identity-view";
import { localDayKey } from "../../src/lib/day";
import { IDENTITY_DIRNAME } from "./schema";
import { getOpenVault, writeJsonAtomic } from "./fs-vault";
import { loadHabits } from "./habits";

function identityDir(vaultPath: string): string {
	return path.join(vaultPath, IDENTITY_DIRNAME);
}

function identityFilePath(vaultPath: string, id: string): string {
	return path.join(identityDir(vaultPath), `${id}.json`);
}

function slugify(statement: string): string {
	const slug = statement
		.toLowerCase()
		.replace(/^i\s+am\s+/i, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 40);
	return slug || "identity";
}

function newIdentityId(statement: string): string {
	return `${slugify(statement)}-${randomBytes(3).toString("hex")}`;
}

function requireOpenVaultPath(): string {
	const vault = getOpenVault();
	if (!vault) {
		throw new Error("No vault is open.");
	}
	return vault.path;
}

function parseIdentityRecord(value: unknown): IdentityRecord | null {
	if (!value || typeof value !== "object") return null;
	const record = value as Record<string, unknown>;
	if (
		typeof record.id !== "string" ||
		typeof record.statement !== "string" ||
		typeof record.note !== "string" ||
		typeof record.createdAt !== "string" ||
		typeof record.updatedAt !== "string" ||
		!Array.isArray(record.habitIds) ||
		!record.habitIds.every((id) => typeof id === "string")
	) {
		return null;
	}
	return {
		id: record.id,
		statement: record.statement,
		note: record.note,
		habitIds: record.habitIds as string[],
		archivedAt: typeof record.archivedAt === "string" ? record.archivedAt : null,
		archiveNote: typeof record.archiveNote === "string" ? record.archiveNote : "",
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
	};
}

function readIdentityFile(filePath: string): IdentityRecord | null {
	try {
		const raw = fs.readFileSync(filePath, "utf8");
		return parseIdentityRecord(JSON.parse(raw) as unknown);
	} catch {
		return null;
	}
}

function writeIdentity(vaultPath: string, identity: IdentityRecord): void {
	writeJsonAtomic(identityFilePath(vaultPath, identity.id), identity);
}

function normalizeStatement(raw: string): string {
	const trimmed = raw.trim().replace(/\s+/g, " ");
	if (!trimmed) return "";
	if (/^i\s+am\b/i.test(trimmed)) {
		return `I am ${trimmed.replace(/^i\s+am\s*/i, "").trim()}`.trim();
	}
	return `I am ${trimmed}`;
}

function normalizeHabitIds(ids: string[] | undefined, validIds: Set<string>): string[] {
	if (!ids) return [];
	const seen = new Set<string>();
	const next: string[] = [];
	for (const id of ids) {
		if (!validIds.has(id) || seen.has(id)) continue;
		seen.add(id);
		next.push(id);
	}
	return next;
}

function toIdentityView(
	identity: IdentityRecord,
	habitsById: Map<string, { name: string; completions: string[]; archived: boolean }>,
	today: string,
): IdentityView {
	const linked = identity.habitIds
		.map((id) => {
			const habit = habitsById.get(id);
			if (!habit) return null;
			return habit;
		})
		.filter((habit): habit is { name: string; completions: string[]; archived: boolean } =>
			Boolean(habit),
		);

	const linkedVotes = linked.map((habit) => ({
		name: habit.name,
		completions: habit.completions,
	}));
	const { voteCount, votesToday, votesWeek } = tallyVotes(linkedVotes, today);
	const habitNames = linked.map((habit) => habit.name);
	const evidence = buildEvidence(linkedVotes);
	const archivedAt = identity.archivedAt ?? "";

	return {
		id: identity.id,
		statement: identity.statement,
		note: identity.note,
		habitIds: identity.habitIds.filter((id) => habitsById.has(id)),
		habitNames,
		voteCount,
		voteLabel: voteLabel(voteCount),
		votesToday,
		votesWeek,
		periodLabel: habitNames.length > 0 ? periodLabel(votesToday, votesWeek) : "",
		evidence,
		hasEvidence: evidence.length > 0,
		linkedLabel: linkedLabel(habitNames),
		archived: Boolean(identity.archivedAt),
		archivedAt,
		archiveNote: identity.archiveNote,
		archivedLabel: archivedDayLabel(identity.archivedAt),
	};
}

function habitMaps(): {
	byId: Map<string, { name: string; completions: string[]; archived: boolean }>;
	options: IdentityHabitOption[];
	validIds: Set<string>;
} {
	const habits = loadHabits();
	const byId = new Map(
		habits.map((habit) => [
			habit.id,
			{
				name: habit.name,
				completions: habit.completions,
				archived: Boolean(habit.archivedAt),
			},
		]),
	);
	const options: IdentityHabitOption[] = habits
		.map((habit) => ({
			id: habit.id,
			name: habit.name,
			archived: Boolean(habit.archivedAt),
		}))
		.sort((a, b) => {
			if (a.archived !== b.archived) return a.archived ? 1 : -1;
			return a.name.localeCompare(b.name);
		});
	return { byId, options, validIds: new Set(habits.map((habit) => habit.id)) };
}

export function loadIdentities(): IdentityRecord[] {
	const vaultPath = requireOpenVaultPath();
	const dir = identityDir(vaultPath);
	fs.mkdirSync(dir, { recursive: true });
	if (!fs.existsSync(dir)) return [];

	const identities: IdentityRecord[] = [];
	for (const entry of fs.readdirSync(dir)) {
		if (!entry.endsWith(".json")) continue;
		const record = readIdentityFile(path.join(dir, entry));
		if (record) identities.push(record);
	}
	identities.sort((a, b) => a.statement.localeCompare(b.statement));
	return identities;
}

export function loadActiveIdentities(): IdentityRecord[] {
	return loadIdentities().filter((identity) => !identity.archivedAt);
}

export function listIdentities(today: string = localDayKey()): IdentitySnapshot {
	const { byId, options } = habitMaps();
	const identities = loadActiveIdentities().map((identity) =>
		toIdentityView(identity, byId, today),
	);
	return { identities, habitOptions: options };
}

export function listArchivedIdentities(today: string = localDayKey()): IdentityView[] {
	const { byId } = habitMaps();
	const archived = loadIdentities().filter((identity) => Boolean(identity.archivedAt));
	archived.sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? ""));
	return archived.map((identity) => toIdentityView(identity, byId, today));
}

export function createIdentity(draft: IdentityDraft, today: string = localDayKey()): IdentityView {
	const vaultPath = requireOpenVaultPath();
	const statement = normalizeStatement(draft.statement);
	if (!statement || statement === "I am") {
		throw new Error("Name the person you want to become.");
	}

	const { byId, validIds } = habitMaps();
	const now = new Date().toISOString();
	const identity: IdentityRecord = {
		id: newIdentityId(statement),
		statement,
		note: (draft.note ?? "").trim(),
		habitIds: normalizeHabitIds(draft.habitIds, validIds),
		archivedAt: null,
		archiveNote: "",
		createdAt: now,
		updatedAt: now,
	};
	writeIdentity(vaultPath, identity);
	return toIdentityView(identity, byId, today);
}

export function updateIdentity(
	id: string,
	draft: IdentityDraft,
	today: string = localDayKey(),
): IdentityView {
	const vaultPath = requireOpenVaultPath();
	const filePath = identityFilePath(vaultPath, id);
	const existing = readIdentityFile(filePath);
	if (!existing) {
		throw new Error("That identity file is missing or invalid.");
	}
	if (existing.archivedAt) {
		throw new Error("Restore this identity before editing it.");
	}

	const statement = normalizeStatement(draft.statement);
	if (!statement || statement === "I am") {
		throw new Error("Name the person you want to become.");
	}

	const { byId, validIds } = habitMaps();
	const next: IdentityRecord = {
		...existing,
		statement,
		note: (draft.note ?? "").trim(),
		habitIds: normalizeHabitIds(draft.habitIds, validIds),
		updatedAt: new Date().toISOString(),
	};
	writeIdentity(vaultPath, next);
	return toIdentityView(next, byId, today);
}

export function archiveIdentity(
	id: string,
	note: string,
	today: string = localDayKey(),
): IdentityView {
	const vaultPath = requireOpenVaultPath();
	const filePath = identityFilePath(vaultPath, id);
	const existing = readIdentityFile(filePath);
	if (!existing) {
		throw new Error("That identity file is missing or invalid.");
	}
	if (existing.archivedAt) {
		throw new Error("That identity is already archived.");
	}

	const { byId } = habitMaps();
	const next: IdentityRecord = {
		...existing,
		archivedAt: `${today}T12:00:00.000Z`,
		archiveNote: note.trim(),
		updatedAt: new Date().toISOString(),
	};
	writeIdentity(vaultPath, next);
	return toIdentityView(next, byId, today);
}

export function restoreIdentity(id: string, today: string = localDayKey()): IdentityView {
	const vaultPath = requireOpenVaultPath();
	const filePath = identityFilePath(vaultPath, id);
	const existing = readIdentityFile(filePath);
	if (!existing) {
		throw new Error("That identity file is missing or invalid.");
	}
	if (!existing.archivedAt) {
		throw new Error("That identity is not archived.");
	}

	const { byId } = habitMaps();
	const next: IdentityRecord = {
		...existing,
		archivedAt: null,
		archiveNote: "",
		updatedAt: new Date().toISOString(),
	};
	writeIdentity(vaultPath, next);
	return toIdentityView(next, byId, today);
}

export function removeIdentity(id: string): void {
	const vaultPath = requireOpenVaultPath();
	const filePath = identityFilePath(vaultPath, id);
	if (!fs.existsSync(filePath)) {
		throw new Error("That identity file is missing or invalid.");
	}
	fs.unlinkSync(filePath);
}
