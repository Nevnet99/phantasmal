import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { DayKey } from "../../src/shared/habits";
import { isDayKey } from "../../src/shared/habits";
import {
	isJournalMoodId,
	moodLabel,
	type JournalDraft,
	type JournalEntryView,
	type JournalGetQuery,
	type JournalHabitOption,
	type JournalMoodId,
	type JournalRecord,
	type JournalSnapshot,
	type JournalSummary,
} from "../../src/shared/journal";
import { formatDayLabel, localDayKey } from "../../src/lib/day";
import { resolveHabitColor } from "../../src/lib/habit-color";
import {
	entryPreview,
	habitTagSlug,
	resolveHabitIdsFromBody,
	stripHabitTagFromBody,
	uniqueJournalTag,
} from "../../src/lib/journal-markdown";
import { JOURNAL_DIRNAME } from "./schema";
import { getOpenVault, writeJsonAtomic } from "./fs-vault";
import { loadHabits } from "./habits";
import { loadBreaks } from "./breaks";

const ENTRY_ID_RE = /^\d{4}-\d{2}-\d{2}(?:-[a-f0-9]{6})?$/;

function journalDir(vaultPath: string): string {
	return path.join(vaultPath, JOURNAL_DIRNAME);
}

function journalFilePath(vaultPath: string, id: string): string {
	return path.join(journalDir(vaultPath), `${id}.json`);
}

function requireOpenVaultPath(): string {
	const vault = getOpenVault();
	if (!vault) {
		throw new Error("No vault is open.");
	}
	return vault.path;
}

function newJournalId(day: DayKey): string {
	return `${day}-${randomBytes(3).toString("hex")}`;
}

function formatTimeLabel(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function parseJournalRecord(value: unknown, fileId?: string): JournalRecord | null {
	if (!value || typeof value !== "object") return null;
	const record = value as Record<string, unknown>;
	const day = typeof record.day === "string" ? record.day : fileId?.slice(0, 10);
	if (!day || !isDayKey(day)) return null;
	const id =
		typeof record.id === "string" && record.id
			? record.id
			: fileId && ENTRY_ID_RE.test(fileId)
				? fileId
				: day;
	if (
		typeof record.title !== "string" ||
		typeof record.body !== "string" ||
		typeof record.createdAt !== "string" ||
		typeof record.updatedAt !== "string" ||
		!Array.isArray(record.habitIds) ||
		!record.habitIds.every((item) => typeof item === "string")
	) {
		return null;
	}
	const mood =
		record.mood === null || record.mood === undefined
			? null
			: isJournalMoodId(record.mood)
				? record.mood
				: null;
	return {
		id,
		day,
		mood,
		title: record.title,
		body: record.body,
		habitIds: record.habitIds as string[],
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
	};
}

function readJournalFile(filePath: string): JournalRecord | null {
	try {
		const fileId = path.basename(filePath, ".json");
		return parseJournalRecord(JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown, fileId);
	} catch {
		return null;
	}
}

function habitOptions(): JournalHabitOption[] {
	const habits: JournalHabitOption[] = loadHabits().map((habit) => ({
		id: habit.id,
		name: habit.name,
		tag: habitTagSlug(habit.name),
		archived: Boolean(habit.archivedAt),
		color: resolveHabitColor(habit.color, habit.id),
		kind: "habit",
	}));

	const seenTags = new Set(habits.map((option) => option.tag.toLowerCase()));
	const breaks: JournalHabitOption[] = [];
	for (const record of loadBreaks()) {
		const tag = uniqueJournalTag(habitTagSlug(record.name), seenTags);
		seenTags.add(tag);
		breaks.push({
			id: record.id,
			name: record.name,
			tag,
			archived: Boolean(record.archivedAt),
			color: resolveHabitColor(record.color, record.id),
			kind: "break",
		});
	}

	return [...habits, ...breaks].sort((a, b) => {
		if (a.archived !== b.archived) return a.archived ? 1 : -1;
		if ((a.kind ?? "habit") !== (b.kind ?? "habit")) {
			return (a.kind ?? "habit") === "habit" ? -1 : 1;
		}
		return a.name.localeCompare(b.name);
	});
}

function emptyEntry(day: DayKey, id = ""): JournalRecord {
	const now = new Date().toISOString();
	return {
		id,
		day,
		mood: null,
		title: "",
		body: "",
		habitIds: [],
		createdAt: now,
		updatedAt: now,
	};
}

function isBlankRecord(
	record: Pick<JournalRecord, "title" | "body" | "mood" | "habitIds">,
): boolean {
	return (
		!record.title.trim() && !record.body.trim() && !record.mood && record.habitIds.length === 0
	);
}

function toEntryView(record: JournalRecord, options: JournalHabitOption[]): JournalEntryView {
	const byId = new Map(options.map((option) => [option.id, option]));
	const habitIds = resolveHabitIdsFromBody(record.body, options);
	const habits = habitIds.map((id) => {
		const option = byId.get(id)!;
		return {
			id: option.id,
			name: option.name,
			tag: option.tag,
			color: option.color,
			kind: option.kind ?? "habit",
		};
	});
	const isEmpty = isBlankRecord({ ...record, habitIds });
	return {
		id: record.id,
		day: record.day,
		dayLabel: formatDayLabel(record.day),
		mood: record.mood,
		moodLabel: moodLabel(record.mood),
		title: record.title,
		body: record.body,
		habitIds,
		habits,
		habitsLabel:
			habits.length === 0
				? "Nothing tagged"
				: habits.length === 1
					? `Tagged: ${habits[0].name}`
					: `Tagged: ${habits[0].name}, +${habits.length - 1}`,
		isEmpty,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
	};
}

function toSummary(record: JournalRecord, knownIds: Set<string>): JournalSummary {
	const habitCount = record.habitIds.filter((id) => knownIds.has(id)).length;
	return {
		id: record.id,
		day: record.day,
		dayLabel: formatDayLabel(record.day),
		title: record.title.trim(),
		mood: record.mood,
		moodLabel: moodLabel(record.mood),
		preview: entryPreview(record.body, record.title),
		habitCount,
		updatedAt: record.updatedAt,
		timeLabel: formatTimeLabel(record.updatedAt),
	};
}

function compareUpdatedDesc(a: JournalRecord, b: JournalRecord): number {
	return b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id);
}

function compareCreatedAsc(a: JournalRecord, b: JournalRecord): number {
	return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

/** Keep createdAt unique per day so same-ms saves don't shuffle list order. */
function uniqueCreatedAt(day: DayKey, preferred: string, excludeId?: string): string {
	const taken = recordsForDay(day)
		.filter((record) => record.id !== excludeId)
		.map((record) => record.createdAt);
	if (!taken.includes(preferred)) return preferred;
	let next = Date.parse(preferred);
	if (Number.isNaN(next)) next = Date.now();
	let candidate = preferred;
	while (taken.includes(candidate)) {
		next += 1;
		candidate = new Date(next).toISOString();
	}
	return candidate;
}

export function loadJournalRecords(): JournalRecord[] {
	const vaultPath = requireOpenVaultPath();
	const dir = journalDir(vaultPath);
	fs.mkdirSync(dir, { recursive: true });
	const records: JournalRecord[] = [];
	for (const entry of fs.readdirSync(dir)) {
		if (!entry.endsWith(".json")) continue;
		const record = readJournalFile(path.join(dir, entry));
		if (record) records.push(record);
	}
	records.sort((a, b) => b.day.localeCompare(a.day) || compareUpdatedDesc(a, b));
	return records;
}

function isJournaledRecord(record: JournalRecord): boolean {
	return !isBlankRecord(record);
}

/** Days that have at least one non-blank journal entry. */
export function loadJournaledDays(): DayKey[] {
	const days = new Set<DayKey>();
	for (const record of loadJournalRecords()) {
		if (isJournaledRecord(record)) days.add(record.day);
	}
	return [...days];
}

export function listJournalSummaries(): JournalSummary[] {
	const knownIds = new Set(loadHabits().map((habit) => habit.id));
	return loadJournalRecords()
		.filter((record) => record.title.trim() || record.body.trim() || record.mood)
		.sort(compareUpdatedDesc)
		.map((record) => toSummary(record, knownIds));
}

/** Non-blank journal entries for a single day, oldest first. */
export function listJournalSummariesForDay(day: DayKey): JournalSummary[] {
	if (!isDayKey(day)) return [];
	const knownIds = new Set(loadHabits().map((habit) => habit.id));
	return recordsForDay(day)
		.filter((record) => record.title.trim() || record.body.trim() || record.mood)
		.map((record) => toSummary(record, knownIds));
}

function recordsForDay(day: DayKey): JournalRecord[] {
	return loadJournalRecords()
		.filter((record) => record.day === day)
		.sort(compareCreatedAsc);
}

function normalizeGetQuery(query: JournalGetQuery | string): {
	day: DayKey;
	entryId: string | null;
} {
	if (typeof query === "string") {
		if (!isDayKey(query)) throw new Error("Invalid journal day.");
		return { day: query, entryId: null };
	}
	if (!isDayKey(query.day)) throw new Error("Invalid journal day.");
	return {
		day: query.day,
		entryId: typeof query.entryId === "string" && query.entryId ? query.entryId : null,
	};
}

export function getJournal(query: JournalGetQuery | string = localDayKey()): JournalSnapshot {
	const { day, entryId } = normalizeGetQuery(query);
	const options = habitOptions();
	const dayRecords = recordsForDay(day);
	const active =
		(entryId ? dayRecords.find((record) => record.id === entryId) : null) ??
		dayRecords[dayRecords.length - 1] ??
		emptyEntry(day);
	const knownIds = new Set(loadHabits().map((habit) => habit.id));
	const dayEntries = dayRecords
		.filter(
			(record) =>
				record.title.trim() || record.body.trim() || record.mood || record.id === active.id,
		)
		.map((record) => toSummary(record, knownIds));
	const recent = listJournalSummaries()
		.filter((item) => item.day !== day)
		.slice(0, 30);
	return {
		entry: toEntryView(active, options),
		dayEntries,
		recent,
		habitOptions: options,
	};
}

export function saveJournal(draft: JournalDraft): JournalEntryView {
	const vaultPath = requireOpenVaultPath();
	if (!isDayKey(draft.day)) {
		throw new Error("Invalid journal day.");
	}

	const options = habitOptions();
	const now = new Date().toISOString();
	const requestedId = typeof draft.id === "string" && draft.id ? draft.id : null;
	const prior = requestedId ? readJournalFile(journalFilePath(vaultPath, requestedId)) : null;

	const body = (draft.body ?? prior?.body ?? "").replace(/\r\n/g, "\n");
	const title = (draft.title ?? prior?.title ?? "").trim();
	const mood: JournalMoodId | null = draft.mood === undefined ? (prior?.mood ?? null) : draft.mood;
	const habitIds = resolveHabitIdsFromBody(body, options);
	const blank = isBlankRecord({ title, body, mood, habitIds });

	if (blank) {
		if (prior) {
			const priorPath = journalFilePath(vaultPath, prior.id);
			if (fs.existsSync(priorPath)) fs.unlinkSync(priorPath);
		}
		return toEntryView(emptyEntry(draft.day, requestedId ?? ""), options);
	}

	// New entry, or migrate a legacy day-named id onto a unique id.
	const id = prior && prior.id !== draft.day ? prior.id : newJournalId(draft.day);

	const next: JournalRecord = {
		id,
		day: draft.day,
		mood,
		title,
		body,
		habitIds,
		createdAt: prior?.createdAt ?? uniqueCreatedAt(draft.day, now),
		updatedAt: now,
	};

	writeJsonAtomic(journalFilePath(vaultPath, id), next);

	if (prior?.id === draft.day && id !== draft.day) {
		const dayPath = journalFilePath(vaultPath, draft.day);
		if (fs.existsSync(dayPath)) fs.unlinkSync(dayPath);
	}

	return toEntryView(next, options);
}

export function removeJournal(id: string): void {
	if (typeof id !== "string" || !id) {
		throw new Error("Invalid journal entry.");
	}
	const vaultPath = requireOpenVaultPath();
	const filePath = journalFilePath(vaultPath, id);
	if (fs.existsSync(filePath)) {
		fs.unlinkSync(filePath);
	}
}

/** Drop a deleted habit from journal habitIds and strip its #tag from bodies. */
export function unlinkHabitFromJournals(habitId: string, tag: string): void {
	const vaultPath = requireOpenVaultPath();
	const now = new Date().toISOString();
	for (const record of loadJournalRecords()) {
		const nextBody = stripHabitTagFromBody(record.body, tag);
		const nextIds = record.habitIds.filter((item) => item !== habitId);
		if (nextBody === record.body && nextIds.length === record.habitIds.length) {
			continue;
		}
		const filePath = journalFilePath(vaultPath, record.id);
		const blank = isBlankRecord({
			title: record.title,
			body: nextBody,
			mood: record.mood,
			habitIds: nextIds,
		});
		if (blank) {
			if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
			continue;
		}
		writeJsonAtomic(filePath, {
			...record,
			body: nextBody,
			habitIds: nextIds,
			updatedAt: now,
		} satisfies JournalRecord);
	}
}
