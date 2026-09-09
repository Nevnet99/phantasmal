import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type {
	BreakDraft,
	BreakHabitOption,
	BreakRecord,
	BreakSnapshot,
	BreakView,
} from "../../src/shared/break";
import { toBreakView } from "../../src/lib/break-view";
import { formatDayLabel, localDayKey } from "../../src/lib/day";
import { isHabitColor, randomHabitColor, resolveHabitColor } from "../../src/lib/habit-color";
import { habitTagSlug, uniqueJournalTag } from "../../src/lib/journal-markdown";
import { isDayKey } from "../../src/shared/habits";
import { BREAKS_DIRNAME } from "./schema";
import { getOpenVault, writeJsonAtomic } from "./fs-vault";
import { loadHabits } from "./habits";

function breaksDir(vaultPath: string): string {
	return path.join(vaultPath, BREAKS_DIRNAME);
}

function breakFilePath(vaultPath: string, id: string): string {
	return path.join(breaksDir(vaultPath), `${id}.json`);
}

function slugify(name: string): string {
	const slug = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 40);
	return slug || "break";
}

function newBreakId(name: string): string {
	return `${slugify(name)}-${randomBytes(3).toString("hex")}`;
}

function requireOpenVaultPath(): string {
	const vault = getOpenVault();
	if (!vault) {
		throw new Error("No vault is open.");
	}
	return vault.path;
}

function parseBreakRecord(value: unknown): BreakRecord | null {
	if (!value || typeof value !== "object") return null;
	const record = value as Record<string, unknown>;
	if (
		typeof record.id !== "string" ||
		typeof record.name !== "string" ||
		typeof record.cue !== "string" ||
		typeof record.note !== "string" ||
		typeof record.invisible !== "string" ||
		typeof record.unattractive !== "string" ||
		typeof record.difficult !== "string" ||
		typeof record.unsatisfying !== "string" ||
		typeof record.createdAt !== "string" ||
		typeof record.updatedAt !== "string" ||
		!Array.isArray(record.replacementHabitIds) ||
		!record.replacementHabitIds.every((id) => typeof id === "string") ||
		!Array.isArray(record.cleanDays) ||
		!record.cleanDays.every((day) => typeof day === "string")
	) {
		return null;
	}
	return {
		id: record.id,
		name: record.name,
		cue: record.cue,
		note: record.note,
		color: typeof record.color === "string" ? record.color : "",
		invisible: record.invisible,
		unattractive: record.unattractive,
		difficult: record.difficult,
		unsatisfying: record.unsatisfying,
		replacementHabitIds: record.replacementHabitIds as string[],
		cleanDays: (record.cleanDays as string[]).filter((day) => isDayKey(day)),
		archivedAt: typeof record.archivedAt === "string" ? record.archivedAt : null,
		archiveNote: typeof record.archiveNote === "string" ? record.archiveNote : "",
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
	};
}

function readBreakFile(filePath: string): BreakRecord | null {
	try {
		const raw = fs.readFileSync(filePath, "utf8");
		return parseBreakRecord(JSON.parse(raw) as unknown);
	} catch {
		return null;
	}
}

function writeBreak(vaultPath: string, record: BreakRecord): void {
	writeJsonAtomic(breakFilePath(vaultPath, record.id), record);
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

function habitMaps(): {
	byId: Map<string, { name: string; archived: boolean }>;
	options: BreakHabitOption[];
	validIds: Set<string>;
} {
	const habits = loadHabits();
	const byId = new Map(
		habits.map((habit) => [habit.id, { name: habit.name, archived: Boolean(habit.archivedAt) }]),
	);
	const options: BreakHabitOption[] = habits
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

function draftFields(draft: BreakDraft, validIds: Set<string>, priorColor?: string) {
	const name = draft.name.trim().replace(/\s+/g, " ");
	if (!name) {
		throw new Error("Name the habit you want to break.");
	}
	const color =
		draft.color !== undefined
			? isHabitColor(draft.color)
				? draft.color
				: randomHabitColor()
			: priorColor && isHabitColor(priorColor)
				? priorColor
				: randomHabitColor();
	return {
		name,
		cue: (draft.cue ?? "").trim(),
		note: (draft.note ?? "").trim(),
		color,
		invisible: (draft.invisible ?? "").trim(),
		unattractive: (draft.unattractive ?? "").trim(),
		difficult: (draft.difficult ?? "").trim(),
		unsatisfying: (draft.unsatisfying ?? "").trim(),
		replacementHabitIds: normalizeHabitIds(draft.replacementHabitIds, validIds),
	};
}

export function loadBreaks(): BreakRecord[] {
	const vaultPath = requireOpenVaultPath();
	const dir = breaksDir(vaultPath);
	fs.mkdirSync(dir, { recursive: true });
	const records: BreakRecord[] = [];
	for (const entry of fs.readdirSync(dir)) {
		if (!entry.endsWith(".json")) continue;
		const record = readBreakFile(path.join(dir, entry));
		if (record) records.push(record);
	}
	records.sort((a, b) => a.name.localeCompare(b.name));
	return records;
}

export function loadActiveBreaks(): BreakRecord[] {
	return loadBreaks().filter((record) => !record.archivedAt);
}

export function listBreaks(day: string = localDayKey()): BreakSnapshot {
	if (!isDayKey(day)) throw new Error("Invalid day.");
	const { byId, options } = habitMaps();
	const breaks = loadActiveBreaks().map((record) => toBreakView(record, day, byId));
	return {
		breaks,
		habitOptions: options,
		todayKey: day,
		todayLabel: formatDayLabel(day),
	};
}

export function listArchivedBreaks(day: string = localDayKey()): BreakView[] {
	if (!isDayKey(day)) throw new Error("Invalid day.");
	const { byId } = habitMaps();
	const archived = loadBreaks().filter((record) => Boolean(record.archivedAt));
	archived.sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? ""));
	return archived.map((record) => toBreakView(record, day, byId));
}

export function createBreak(draft: BreakDraft, day: string = localDayKey()): BreakView {
	if (!isDayKey(day)) throw new Error("Invalid day.");
	const vaultPath = requireOpenVaultPath();
	const { byId, validIds } = habitMaps();
	const fields = draftFields(draft, validIds);
	const now = new Date().toISOString();
	const record: BreakRecord = {
		id: newBreakId(fields.name),
		...fields,
		color: resolveHabitColor(fields.color, fields.name),
		cleanDays: [],
		archivedAt: null,
		archiveNote: "",
		createdAt: now,
		updatedAt: now,
	};
	writeBreak(vaultPath, record);
	return toBreakView(record, day, byId);
}

export function updateBreak(id: string, draft: BreakDraft, day: string = localDayKey()): BreakView {
	if (!isDayKey(day)) throw new Error("Invalid day.");
	const vaultPath = requireOpenVaultPath();
	const filePath = breakFilePath(vaultPath, id);
	const existing = readBreakFile(filePath);
	if (!existing) {
		throw new Error("That break file is missing or invalid.");
	}
	if (existing.archivedAt) {
		throw new Error("Restore this break before editing it.");
	}

	const { byId, validIds } = habitMaps();
	const fields = draftFields(draft, validIds, existing.color);
	const next: BreakRecord = {
		...existing,
		...fields,
		color: resolveHabitColor(fields.color, existing.id),
		updatedAt: new Date().toISOString(),
	};
	writeBreak(vaultPath, next);
	return toBreakView(next, day, byId);
}

export function toggleBreakCleanDay(id: string, day: string): BreakView {
	if (!isDayKey(day)) throw new Error("Invalid day.");
	const vaultPath = requireOpenVaultPath();
	const filePath = breakFilePath(vaultPath, id);
	const existing = readBreakFile(filePath);
	if (!existing) {
		throw new Error("That break file is missing or invalid.");
	}
	if (existing.archivedAt) {
		throw new Error("Restore this break before checking it off.");
	}

	const set = new Set(existing.cleanDays);
	if (set.has(day)) set.delete(day);
	else set.add(day);
	const cleanDays = [...set].sort();
	const next: BreakRecord = {
		...existing,
		cleanDays,
		updatedAt: new Date().toISOString(),
	};
	writeBreak(vaultPath, next);
	const { byId } = habitMaps();
	return toBreakView(next, day, byId);
}

export function archiveBreak(id: string, note: string, day: string = localDayKey()): BreakView {
	if (!isDayKey(day)) throw new Error("Invalid day.");
	const vaultPath = requireOpenVaultPath();
	const filePath = breakFilePath(vaultPath, id);
	const existing = readBreakFile(filePath);
	if (!existing) {
		throw new Error("That break file is missing or invalid.");
	}
	if (existing.archivedAt) {
		throw new Error("That break is already archived.");
	}

	const { byId } = habitMaps();
	const next: BreakRecord = {
		...existing,
		archivedAt: `${day}T12:00:00.000Z`,
		archiveNote: note.trim(),
		updatedAt: new Date().toISOString(),
	};
	writeBreak(vaultPath, next);
	return toBreakView(next, day, byId);
}

export function restoreBreak(id: string, day: string = localDayKey()): BreakView {
	if (!isDayKey(day)) throw new Error("Invalid day.");
	const vaultPath = requireOpenVaultPath();
	const filePath = breakFilePath(vaultPath, id);
	const existing = readBreakFile(filePath);
	if (!existing) {
		throw new Error("That break file is missing or invalid.");
	}
	if (!existing.archivedAt) {
		throw new Error("That break is not archived.");
	}

	const { byId } = habitMaps();
	const next: BreakRecord = {
		...existing,
		archivedAt: null,
		archiveNote: "",
		updatedAt: new Date().toISOString(),
	};
	writeBreak(vaultPath, next);
	return toBreakView(next, day, byId);
}

export function removeBreak(id: string): { id: string; tag: string } {
	const vaultPath = requireOpenVaultPath();
	const filePath = breakFilePath(vaultPath, id);
	const existing = readBreakFile(filePath);
	if (!existing) {
		throw new Error("That break file is missing or invalid.");
	}

	const seen = new Set(loadHabits().map((habit) => habitTagSlug(habit.name).toLowerCase()));
	let tag = habitTagSlug(existing.name);
	for (const item of loadBreaks()) {
		const next = uniqueJournalTag(habitTagSlug(item.name), seen);
		seen.add(next);
		if (item.id === id) {
			tag = next;
			break;
		}
	}

	fs.unlinkSync(filePath);
	return { id, tag };
}
