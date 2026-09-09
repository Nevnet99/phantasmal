/** Identity statements — Atomic Habits' deepest behavior layer. */

export const IDENTITY_CHANNELS = {
	list: "identity:list",
	listArchived: "identity:listArchived",
	create: "identity:create",
	update: "identity:update",
	archive: "identity:archive",
	restore: "identity:restore",
	remove: "identity:remove",
} as const;

export type IdentityEvidence = {
	day: string;
	habitName: string;
	/** e.g. "Write · Mon" */
	label: string;
};

export type IdentityRecord = {
	id: string;
	/** Full statement, e.g. "I am a writer". */
	statement: string;
	/** Why this identity matters. */
	note: string;
	/** Habits that cast votes for this identity. */
	habitIds: string[];
	archivedAt: string | null;
	archiveNote: string;
	createdAt: string;
	updatedAt: string;
};

export type IdentityDraft = {
	statement: string;
	note?: string;
	habitIds?: string[];
};

export type IdentityHabitOption = {
	id: string;
	name: string;
	archived: boolean;
};

export type IdentityView = {
	id: string;
	statement: string;
	note: string;
	habitIds: string[];
	habitNames: string[];
	/** Total check-offs across linked habits (votes cast). */
	voteCount: number;
	voteLabel: string;
	votesToday: number;
	votesWeek: number;
	/** e.g. "2 today · 9 this week" — empty when no linked habits. */
	periodLabel: string;
	/** Recent check-offs that counted as votes (newest first). */
	evidence: IdentityEvidence[];
	hasEvidence: boolean;
	linkedLabel: string;
	archived: boolean;
	archivedAt: string;
	archiveNote: string;
	archivedLabel: string;
};

export type IdentitySnapshot = {
	identities: IdentityView[];
	habitOptions: IdentityHabitOption[];
};

export type IdentityApi = {
	list: () => Promise<IdentitySnapshot>;
	listArchived: () => Promise<IdentityView[]>;
	create: (draft: IdentityDraft) => Promise<IdentityView>;
	update: (id: string, draft: IdentityDraft) => Promise<IdentityView>;
	archive: (id: string, note: string) => Promise<IdentityView>;
	restore: (id: string) => Promise<IdentityView>;
	remove: (id: string) => Promise<void>;
};

export function isIdentityDraft(value: unknown): value is IdentityDraft {
	if (!value || typeof value !== "object") return false;
	const draft = value as Record<string, unknown>;
	if (typeof draft.statement !== "string") return false;
	if (draft.note !== undefined && typeof draft.note !== "string") return false;
	if (draft.habitIds !== undefined) {
		if (!Array.isArray(draft.habitIds) || !draft.habitIds.every((id) => typeof id === "string")) {
			return false;
		}
	}
	return true;
}
