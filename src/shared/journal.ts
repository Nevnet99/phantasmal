/** Journal entries — markdown reflections with mood and habit tags. */

export const JOURNAL_CHANNELS = {
	get: "journal:get",
	list: "journal:list",
	save: "journal:save",
	remove: "journal:remove",
} as const;

export const JOURNAL_MOODS = [
	{ id: "awful", label: "Awful", icon: "sentiment_very_dissatisfied" },
	{ id: "bad", label: "Bad", icon: "sentiment_dissatisfied" },
	{ id: "ok", label: "Okay", icon: "sentiment_neutral" },
	{ id: "good", label: "Good", icon: "sentiment_satisfied" },
	{ id: "great", label: "Great", icon: "sentiment_very_satisfied" },
] as const;

export type JournalMoodId = (typeof JOURNAL_MOODS)[number]["id"];

export type JournalHabitOption = {
	id: string;
	name: string;
	/** Hashtag slug, e.g. eat-breakfast */
	tag: string;
	archived: boolean;
	/** Stable accent for chips and graph cells. */
	color: string;
	/** Habit (default) or break — both use #slug tags in the body. */
	kind?: "habit" | "break";
};

export type JournalRecord = {
	/** Unique entry id (`YYYY-MM-DD-hex` or legacy day key). */
	id: string;
	day: string;
	mood: JournalMoodId | null;
	title: string;
	/** Markdown body. Habit tags use #slug. */
	body: string;
	habitIds: string[];
	createdAt: string;
	updatedAt: string;
};

export type JournalDraft = {
	day: string;
	/** When set, updates that entry; when omitted, creates a new entry for the day. */
	id?: string | null;
	mood?: JournalMoodId | null;
	title?: string;
	body?: string;
	habitIds?: string[];
};

export type JournalHabitTag = {
	id: string;
	name: string;
	tag: string;
	color: string;
	kind?: "habit" | "break";
};

export type JournalEntryView = {
	id: string;
	day: string;
	dayLabel: string;
	mood: JournalMoodId | null;
	moodLabel: string;
	title: string;
	body: string;
	habitIds: string[];
	habits: JournalHabitTag[];
	habitsLabel: string;
	isEmpty: boolean;
	createdAt: string;
	updatedAt: string;
};

export type JournalSummary = {
	id: string;
	day: string;
	dayLabel: string;
	title: string;
	mood: JournalMoodId | null;
	moodLabel: string;
	preview: string;
	habitCount: number;
	updatedAt: string;
	timeLabel: string;
};

export type JournalSnapshot = {
	entry: JournalEntryView;
	/** Other saved entries on the same day (newest first), including the active entry when saved. */
	dayEntries: JournalSummary[];
	recent: JournalSummary[];
	habitOptions: JournalHabitOption[];
};

export type JournalGetQuery = {
	day: string;
	entryId?: string | null;
};

export type JournalApi = {
	get: (query: JournalGetQuery | string) => Promise<JournalSnapshot>;
	list: () => Promise<JournalSummary[]>;
	save: (draft: JournalDraft) => Promise<JournalEntryView>;
	remove: (id: string) => Promise<void>;
};

export function isJournalMoodId(value: unknown): value is JournalMoodId {
	return typeof value === "string" && JOURNAL_MOODS.some((mood) => mood.id === value);
}

export function isJournalDraft(value: unknown): value is JournalDraft {
	if (!value || typeof value !== "object") return false;
	const draft = value as Record<string, unknown>;
	if (typeof draft.day !== "string") return false;
	if (draft.id !== undefined && draft.id !== null && typeof draft.id !== "string") return false;
	if (draft.mood !== undefined && draft.mood !== null && !isJournalMoodId(draft.mood)) {
		return false;
	}
	if (draft.title !== undefined && typeof draft.title !== "string") return false;
	if (draft.body !== undefined && typeof draft.body !== "string") return false;
	if (draft.habitIds !== undefined) {
		if (!Array.isArray(draft.habitIds) || !draft.habitIds.every((id) => typeof id === "string")) {
			return false;
		}
	}
	return true;
}

export function isJournalGetQuery(value: unknown): value is JournalGetQuery {
	if (typeof value === "string") return true;
	if (!value || typeof value !== "object") return false;
	const query = value as Record<string, unknown>;
	if (typeof query.day !== "string") return false;
	if (query.entryId !== undefined && query.entryId !== null && typeof query.entryId !== "string") {
		return false;
	}
	return true;
}

export function moodLabel(mood: JournalMoodId | null): string {
	if (!mood) return "";
	return JOURNAL_MOODS.find((item) => item.id === mood)?.label ?? "";
}
