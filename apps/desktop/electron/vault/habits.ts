import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type {
	DayKey,
	HabitDraft,
	HabitRecord,
	HabitSchedule,
	HabitView,
	TrackQuery,
	TrackSnapshot,
} from "../../src/shared/habits";
import { isDayKey } from "../../src/shared/habits";
import { buildTrackSnapshot, toHabitView, toHabitViews } from "../../src/lib/track-view";
import { isHabitColor, randomHabitColor, resolveHabitColor } from "../../src/lib/habit-color";
import { normalizeSchedule } from "../../src/lib/schedule";
import {
	moveStackAmong,
	normalizeStackAfterId,
	normalizeStackOrder,
	wouldCreateStackCycle,
} from "../../src/lib/stack";
import { isHabitActiveOn } from "../../src/lib/habit-status";
import { habitTagSlug } from "../../src/lib/journal-markdown";
import { HABITS_DIRNAME } from "./schema";
import { getOpenVault, writeJsonAtomic } from "./fs-vault";
import { loadActiveIdentities } from "./identity";
import { loadJournaledDays, listJournalSummariesForDay } from "./journal";
import { listBreaks, loadBreaks } from "./breaks";

function habitsDir(vaultPath: string): string {
	return path.join(vaultPath, HABITS_DIRNAME);
}

function habitFilePath(vaultPath: string, id: string): string {
	return path.join(habitsDir(vaultPath), `${id}.json`);
}

function slugify(name: string): string {
	const slug = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 40);
	return slug || "habit";
}

function newHabitId(name: string): string {
	return `${slugify(name)}-${randomBytes(3).toString("hex")}`;
}

function parseHabitRecord(value: unknown): HabitRecord | null {
	if (!value || typeof value !== "object") return null;
	const record = value as Record<string, unknown>;
	if (
		typeof record.id !== "string" ||
		typeof record.name !== "string" ||
		typeof record.cue !== "string" ||
		typeof record.note !== "string" ||
		typeof record.createdAt !== "string" ||
		typeof record.updatedAt !== "string" ||
		!Array.isArray(record.completions) ||
		!record.completions.every((day) => typeof day === "string")
	) {
		return null;
	}

	const createdDay = record.createdAt.slice(0, 10);
	const fallbackAnchor = /^\d{4}-\d{2}-\d{2}$/.test(createdDay) ? createdDay : "1970-01-01";

	return {
		id: record.id,
		name: record.name,
		cue: record.cue,
		note: record.note,
		color: resolveHabitColor(typeof record.color === "string" ? record.color : null, record.id),
		schedule: normalizeSchedule(record.schedule, fallbackAnchor),
		stackAfterId: normalizeStackAfterId(record.stackAfterId),
		stackOrder: normalizeStackOrder(record.stackOrder),
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
		archivedAt: typeof record.archivedAt === "string" ? record.archivedAt : null,
		archiveNote: typeof record.archiveNote === "string" ? record.archiveNote : "",
		completions: record.completions as DayKey[],
	};
}

function requireOpenVaultPath(): string {
	const vault = getOpenVault();
	if (!vault) {
		throw new Error("No vault is open.");
	}
	return vault.path;
}

function readHabitFile(filePath: string): HabitRecord | null {
	try {
		const parsed: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
		return parseHabitRecord(parsed);
	} catch {
		return null;
	}
}

function writeHabit(vaultPath: string, habit: HabitRecord): void {
	writeJsonAtomic(habitFilePath(vaultPath, habit.id), habit);
}

function scheduleFromDraft(draft: HabitDraft, fallbackAnchor: DayKey): HabitSchedule {
	const schedule = normalizeSchedule(draft.schedule ?? { type: "daily" }, fallbackAnchor);
	if (schedule.type === "weekly" && schedule.weekdays.length === 0) {
		throw new Error("Pick at least one weekday.");
	}
	return schedule;
}

function resolveStackAfterId(
	habits: HabitRecord[],
	habitId: string,
	draft: HabitDraft,
): string | null {
	const stackAfterId = normalizeStackAfterId(draft.stackAfterId);
	if (!stackAfterId) return null;
	const target = habits.find((habit) => habit.id === stackAfterId);
	if (!target || target.archivedAt) {
		throw new Error("That stack target habit is missing.");
	}
	if (wouldCreateStackCycle(habits, habitId, stackAfterId)) {
		throw new Error("That stack would loop back on itself.");
	}
	return stackAfterId;
}

function nextStackOrder(habits: HabitRecord[], stackAfterId: string | null): number {
	let max = -1;
	for (const habit of habits) {
		if (habit.archivedAt) continue;
		if (habit.stackAfterId !== stackAfterId) continue;
		if (habit.stackOrder > max) max = habit.stackOrder;
	}
	return max + 1;
}

export function loadHabits(): HabitRecord[] {
	const vaultPath = requireOpenVaultPath();
	const dir = habitsDir(vaultPath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
		return [];
	}

	const habits: HabitRecord[] = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
		const habit = readHabitFile(path.join(dir, entry.name));
		if (habit) habits.push(habit);
	}

	habits.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
	return habits;
}

export function listHabits(day: DayKey): HabitView[] {
	const active = loadHabits().filter((habit) => isHabitActiveOn(habit, day));
	return toHabitViews(active, day);
}

export function listArchivedHabits(day: DayKey = "1970-01-01"): HabitView[] {
	const archived = loadHabits().filter((habit) => Boolean(habit.archivedAt));
	archived.sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? ""));
	return toHabitViews(archived, day);
}

export function getTrackSnapshot(query: TrackQuery): TrackSnapshot {
	const identities = loadActiveIdentities().map((identity) => ({
		id: identity.id,
		statement: identity.statement,
		habitIds: identity.habitIds,
	}));
	const journaledDays = query.includeJournalGraph ? new Set(loadJournaledDays()) : null;
	const journalGraphSince =
		query.includeJournalGraph && isDayKey(query.journalGraphSince)
			? query.journalGraphSince
			: query.includeJournalGraph
				? query.selectedDay
				: null;
	const journalEntries = listJournalSummariesForDay(query.selectedDay);
	const breakRecords = loadBreaks();
	const breaks = listBreaks(query.selectedDay).breaks;
	return buildTrackSnapshot(
		loadHabits(),
		query.selectedDay,
		query.month,
		query.year,
		undefined,
		identities,
		journaledDays,
		journalGraphSince,
		journalEntries,
		breaks,
		breakRecords,
	);
}

export function createHabit(draft: HabitDraft, day: DayKey): HabitView {
	const vaultPath = requireOpenVaultPath();
	const name = draft.name.trim();
	if (!name) {
		throw new Error("Name a habit before saving.");
	}

	const existing = loadHabits();
	const now = new Date().toISOString();
	const createdAt = `${day}T12:00:00.000Z`;
	const schedule = scheduleFromDraft(draft, day);
	const id = newHabitId(name);
	const stackAfterId = resolveStackAfterId(existing, id, draft);

	const habit: HabitRecord = {
		id,
		name,
		cue: (draft.cue ?? "").trim(),
		note: (draft.note ?? "").trim(),
		color: isHabitColor(draft.color) ? draft.color.toLowerCase() : randomHabitColor(),
		schedule,
		stackAfterId,
		stackOrder: nextStackOrder(existing, stackAfterId),
		createdAt,
		updatedAt: now,
		archivedAt: null,
		archiveNote: "",
		completions: [],
	};

	writeHabit(vaultPath, habit);
	const byId = new Map([...existing, habit].map((item) => [item.id, item]));
	return toHabitView(habit, day, byId);
}

export function updateHabit(id: string, draft: HabitDraft, day: DayKey): HabitView {
	const vaultPath = requireOpenVaultPath();
	const filePath = habitFilePath(vaultPath, id);
	const habit = readHabitFile(filePath);
	if (!habit) {
		throw new Error("That habit file is missing or invalid.");
	}
	if (habit.archivedAt) {
		throw new Error("Archived habits can’t be edited. Restore isn’t available yet.");
	}

	const name = draft.name.trim();
	if (!name) {
		throw new Error("Name a habit before saving.");
	}

	const existing = loadHabits();
	const fallbackAnchor = habit.schedule.type === "daily" ? day : habit.schedule.anchorDay;
	const schedule = scheduleFromDraft(draft, fallbackAnchor);
	const stackAfterId = resolveStackAfterId(existing, id, draft);
	const stackOrder =
		stackAfterId === habit.stackAfterId
			? habit.stackOrder
			: nextStackOrder(
					existing.filter((item) => item.id !== id),
					stackAfterId,
				);

	const next: HabitRecord = {
		...habit,
		name,
		cue: (draft.cue ?? "").trim(),
		note: (draft.note ?? "").trim(),
		color: isHabitColor(draft.color) ? draft.color.toLowerCase() : habit.color,
		schedule,
		stackAfterId,
		stackOrder,
		updatedAt: new Date().toISOString(),
	};
	writeHabit(vaultPath, next);
	const byId = new Map(existing.map((item) => [item.id, item.id === id ? next : item] as const));
	return toHabitView(next, day, byId);
}

export function toggleHabitDay(id: string, day: DayKey): HabitView {
	const vaultPath = requireOpenVaultPath();
	const filePath = habitFilePath(vaultPath, id);
	const habit = readHabitFile(filePath);
	if (!habit) {
		throw new Error("That habit file is missing or invalid.");
	}
	if (habit.archivedAt) {
		throw new Error("Archived habits can’t be checked off.");
	}

	const set = new Set(habit.completions);
	if (set.has(day)) {
		set.delete(day);
	} else {
		set.add(day);
	}

	const next: HabitRecord = {
		...habit,
		updatedAt: new Date().toISOString(),
		completions: [...set].sort(),
	};
	writeHabit(vaultPath, next);
	const byId = new Map(loadHabits().map((item) => [item.id, item]));
	return toHabitView(next, day, byId);
}

export function moveStackHabit(id: string, direction: "up" | "down", day: DayKey): HabitView {
	const vaultPath = requireOpenVaultPath();
	const existing = loadHabits();
	const moved = moveStackAmong(existing, id, direction);
	const now = new Date().toISOString();
	for (const habit of moved) {
		const before = existing.find((item) => item.id === habit.id);
		if (
			!before ||
			before.stackAfterId !== habit.stackAfterId ||
			before.stackOrder !== habit.stackOrder
		) {
			writeHabit(vaultPath, { ...habit, updatedAt: now });
		}
	}
	const byId = new Map(loadHabits().map((item) => [item.id, item]));
	const next = byId.get(id);
	if (!next) {
		throw new Error("That habit file is missing or invalid.");
	}
	return toHabitView(next, day, byId);
}

export function archiveHabit(id: string, note: string, day: DayKey): HabitView {
	const vaultPath = requireOpenVaultPath();
	const filePath = habitFilePath(vaultPath, id);
	const habit = readHabitFile(filePath);
	if (!habit) {
		throw new Error("That habit file is missing or invalid.");
	}
	if (habit.archivedAt) {
		throw new Error("That habit is already archived.");
	}

	const next: HabitRecord = {
		...habit,
		// Stamp the selected local day so Track drops the habit from that day onward.
		archivedAt: `${day}T12:00:00.000Z`,
		archiveNote: note.trim(),
		updatedAt: new Date().toISOString(),
	};
	writeHabit(vaultPath, next);
	const byId = new Map(loadHabits().map((item) => [item.id, item]));
	return toHabitView(next, day, byId);
}

export function restoreHabit(id: string, day: DayKey): HabitView {
	const vaultPath = requireOpenVaultPath();
	const filePath = habitFilePath(vaultPath, id);
	const habit = readHabitFile(filePath);
	if (!habit) {
		throw new Error("That habit file is missing or invalid.");
	}
	if (!habit.archivedAt) {
		throw new Error("That habit is not archived.");
	}

	const next: HabitRecord = {
		...habit,
		archivedAt: null,
		archiveNote: "",
		updatedAt: new Date().toISOString(),
	};
	writeHabit(vaultPath, next);
	const byId = new Map(loadHabits().map((item) => [item.id, item]));
	return toHabitView(next, day, byId);
}

export function removeHabit(id: string): { id: string; tag: string } {
	const vaultPath = requireOpenVaultPath();
	const filePath = habitFilePath(vaultPath, id);
	const habit = readHabitFile(filePath);
	if (!habit) {
		throw new Error("That habit file is missing or invalid.");
	}
	const tag = habitTagSlug(habit.name);

	fs.unlinkSync(filePath);

	for (const stacked of loadHabits()) {
		if (stacked.stackAfterId !== id) continue;
		const next: HabitRecord = {
			...stacked,
			stackAfterId: null,
			updatedAt: new Date().toISOString(),
		};
		writeHabit(vaultPath, next);
	}

	return { id, tag };
}
