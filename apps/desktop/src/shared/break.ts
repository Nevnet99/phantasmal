/** Break — invert the four laws to dismantle bad habits. */

export const BREAK_CHANNELS = {
	list: "breaks:list",
	listArchived: "breaks:listArchived",
	create: "breaks:create",
	update: "breaks:update",
	toggleCleanDay: "breaks:toggleCleanDay",
	archive: "breaks:archive",
	restore: "breaks:restore",
	remove: "breaks:remove",
} as const;

export type BreakRecord = {
	id: string;
	/** Bad habit name, e.g. "Late-night scrolling". */
	name: string;
	/** When / where the urge usually appears. */
	cue: string;
	note: string;
	/** Accent for cards. */
	color: string;
	/** Make it invisible — hide or avoid the cue. */
	invisible: string;
	/** Make it unattractive — reframe the craving. */
	unattractive: string;
	/** Make it difficult — add friction. */
	difficult: string;
	/** Make it unsatisfying — add a cost or accountability. */
	unsatisfying: string;
	/** Good habits that replace this one. */
	replacementHabitIds: string[];
	/** Days the bad habit was resisted (local YYYY-MM-DD). */
	cleanDays: string[];
	archivedAt: string | null;
	archiveNote: string;
	createdAt: string;
	updatedAt: string;
};

export type BreakDraft = {
	name: string;
	cue?: string;
	note?: string;
	color?: string;
	invisible?: string;
	unattractive?: string;
	difficult?: string;
	unsatisfying?: string;
	replacementHabitIds?: string[];
};

export type BreakHabitOption = {
	id: string;
	name: string;
	archived: boolean;
};

export type BreakLaw = {
	id: "invisible" | "unattractive" | "difficult" | "unsatisfying";
	title: string;
	prompt: string;
	body: string;
	filled: boolean;
};

export type BreakView = {
	id: string;
	name: string;
	cue: string;
	note: string;
	color: string;
	invisible: string;
	unattractive: string;
	difficult: string;
	unsatisfying: string;
	replacementHabitIds: string[];
	replacementNames: string[];
	linkedLabel: string;
	laws: BreakLaw[];
	lawsFilled: number;
	lawsLabel: string;
	cleanDays: string[];
	cleanToday: boolean;
	streak: number;
	streakLabel: string;
	archived: boolean;
	archivedAt: string;
	archiveNote: string;
	archivedLabel: string;
};

export type BreakSnapshot = {
	breaks: BreakView[];
	habitOptions: BreakHabitOption[];
	todayKey: string;
	todayLabel: string;
};

export type BreakApi = {
	list: (day?: string) => Promise<BreakSnapshot>;
	listArchived: () => Promise<BreakView[]>;
	create: (draft: BreakDraft, day: string) => Promise<BreakView>;
	update: (id: string, draft: BreakDraft, day: string) => Promise<BreakView>;
	toggleCleanDay: (id: string, day: string) => Promise<BreakView>;
	archive: (id: string, note: string, day: string) => Promise<BreakView>;
	restore: (id: string, day: string) => Promise<BreakView>;
	remove: (id: string) => Promise<void>;
};

export function isBreakDraft(value: unknown): value is BreakDraft {
	if (!value || typeof value !== "object") return false;
	const draft = value as Record<string, unknown>;
	if (typeof draft.name !== "string") return false;
	if (draft.cue !== undefined && typeof draft.cue !== "string") return false;
	if (draft.note !== undefined && typeof draft.note !== "string") return false;
	if (draft.color !== undefined && typeof draft.color !== "string") return false;
	if (draft.invisible !== undefined && typeof draft.invisible !== "string") return false;
	if (draft.unattractive !== undefined && typeof draft.unattractive !== "string") return false;
	if (draft.difficult !== undefined && typeof draft.difficult !== "string") return false;
	if (draft.unsatisfying !== undefined && typeof draft.unsatisfying !== "string") return false;
	if (draft.replacementHabitIds !== undefined) {
		if (
			!Array.isArray(draft.replacementHabitIds) ||
			!draft.replacementHabitIds.every((id) => typeof id === "string")
		) {
			return false;
		}
	}
	return true;
}
