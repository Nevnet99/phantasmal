/** Shared habit types and IPC channel names (renderer + preload + main). */

export const HABIT_CHANNELS = {
	list: "habits:list",
	listArchived: "habits:listArchived",
	getTrack: "habits:getTrack",
	create: "habits:create",
	update: "habits:update",
	toggleDay: "habits:toggleDay",
	moveStack: "habits:moveStack",
	archive: "habits:archive",
	restore: "habits:restore",
	remove: "habits:remove",
} as const;

/** Local calendar day as YYYY-MM-DD. */
export type DayKey = string;

export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

/** Monday = 0 … Sunday = 6 (matches Track calendar). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type HabitSchedule =
	| { type: "daily" }
	| {
			type: "weekly";
			weekdays: Weekday[];
			/** 1 = every week, 2 = every other week, … */
			intervalWeeks: number;
			/** Any day in an “on” week for the biweekly cycle. */
			anchorDay: DayKey;
	  }
	| {
			type: "every_n_days";
			intervalDays: number;
			anchorDay: DayKey;
	  };

export const DEFAULT_SCHEDULE: HabitSchedule = { type: "daily" };

export type HabitRecord = {
	id: string;
	name: string;
	/** Optional cue — when / where this habit happens. */
	cue: string;
	/** Optional note (identity, stacking, 2-minute version, etc.). */
	note: string;
	schedule: HabitSchedule;
	/** Stack after this habit id (“After X, I will Y”). */
	stackAfterId: string | null;
	/** Order among siblings that share the same stackAfterId (lower first). */
	stackOrder: number;
	createdAt: string;
	updatedAt: string;
	/** ISO timestamp when archived; null if active. */
	archivedAt: string | null;
	/** Optional note explaining why the habit was archived. */
	archiveNote: string;
	/** Completion days as YYYY-MM-DD (local). */
	completions: DayKey[];
};

export type HabitDraft = {
	name: string;
	cue?: string;
	note?: string;
	schedule?: HabitSchedule;
	stackAfterId?: string | null;
};

/** Habit as shown in Track / Create lists. */
export type HabitView = {
	id: string;
	name: string;
	cue: string;
	note: string;
	schedule: HabitSchedule;
	scheduleLabel: string;
	stackAfterId: string | null;
	stackAfterName: string;
	stackLabel: string;
	stackDepth: number;
	stackOrder: number;
	canMoveUp: boolean;
	canMoveDown: boolean;
	due: boolean;
	done: boolean;
	streak: number;
	streakLabel: string;
	archived: boolean;
	archivedAt: string;
	archiveNote: string;
	archivedLabel: string;
};

export type TrackGroup = {
	key: string;
	title: string;
	identityId: string | null;
	habits: HabitView[];
	/** e.g. "2 votes still open today" — empty when done or ungrouped. */
	votesOpenLabel: string;
};

export type GraphCell = {
	day: DayKey;
	level: ActivityLevel;
	label: string;
	completed: number;
	total: number;
	doneNames: string[];
	missedNames: string[];
};

export type CalendarCell = {
	key: string;
	day: DayKey | "";
	dayNum: string;
	empty: boolean;
	inMonth: boolean;
	isToday: boolean;
	isSelected: boolean;
	level: ActivityLevel;
	label: string;
	completed: number;
	total: number;
	doneNames: string[];
	missedNames: string[];
};

export type TrackQuery = {
	selectedDay: DayKey;
	/** 1–12 */
	month: number;
	year: number;
};

export type TrackSnapshot = {
	todayKey: DayKey;
	selectedKey: DayKey;
	selectedLabel: string;
	isSelectedToday: boolean;
	summaryLabel: string;
	remainingCount: number;
	doneCount: number;
	totalCount: number;
	habits: HabitView[];
	remaining: HabitView[];
	/** Habits grouped by linked identity (stack families stay together). */
	groups: TrackGroup[];
	graph: GraphCell[];
	weekdays: string[];
	calendarMonthLabel: string;
	calendarYear: number;
	calendarMonth: number;
	calendarCells: CalendarCell[];
};

export type HabitsApi = {
	list: (day: DayKey) => Promise<HabitView[]>;
	listArchived: () => Promise<HabitView[]>;
	getTrack: (query: TrackQuery) => Promise<TrackSnapshot>;
	create: (draft: HabitDraft, day: DayKey) => Promise<HabitView>;
	update: (id: string, draft: HabitDraft, day: DayKey) => Promise<HabitView>;
	toggleDay: (id: string, day: DayKey) => Promise<HabitView>;
	moveStack: (id: string, direction: "up" | "down", day: DayKey) => Promise<HabitView>;
	archive: (id: string, note: string, day: DayKey) => Promise<HabitView>;
	restore: (id: string, day: DayKey) => Promise<HabitView>;
	remove: (id: string) => Promise<void>;
};

export function isDayKey(value: unknown): value is DayKey {
	return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isTrackQuery(value: unknown): value is TrackQuery {
	if (!value || typeof value !== "object") return false;
	const record = value as Record<string, unknown>;
	return (
		isDayKey(record.selectedDay) &&
		typeof record.month === "number" &&
		record.month >= 1 &&
		record.month <= 12 &&
		typeof record.year === "number" &&
		Number.isInteger(record.year)
	);
}
