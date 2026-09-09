import type {
	ActivityLevel,
	CalendarCell,
	DayKey,
	HabitGraph,
	HabitGraphCell,
	HabitGraphDay,
	HabitGraphRow,
	HabitRecord,
	HabitView,
	TrackSnapshot,
} from "../shared/habits";
import { JOURNAL_GRAPH_COLOR, JOURNAL_GRAPH_ID, JOURNAL_GRAPH_NAME } from "../shared/habits";
import {
	daysInMonth,
	formatDayLabel,
	formatMonthLabel,
	localDayKey,
	mondayIndex,
	shiftDayKey,
} from "./day";
import { resolveHabitColor } from "./habit-color";
import { isDueOn, scheduleLabel, streakOnSchedule } from "./schedule";
import {
	canMoveStackDown,
	canMoveStackUp,
	normalizeStackOrder,
	orderByStack,
	stackDepth,
} from "./stack";
import { isHabitActiveOn, isHabitArchived } from "./habit-status";
import { buildTrackGroups, type IdentityLink } from "./track-groups";

export function activityLevel(completed: number, total: number): ActivityLevel {
	if (total <= 0 || completed <= 0) return 0;
	const ratio = completed / total;
	if (ratio <= 0.25) return 1;
	if (ratio <= 0.5) return 2;
	if (ratio <= 0.75) return 3;
	return 4;
}

/** Only habits due and still active on `day` count toward calendar / graph intensity. */
export function dayStats(
	habits: HabitRecord[],
	day: DayKey,
): {
	completed: number;
	total: number;
	doneNames: string[];
	missedNames: string[];
} {
	const due = habits.filter((habit) => isHabitActiveOn(habit, day) && isDueOn(habit.schedule, day));
	const doneNames: string[] = [];
	const missedNames: string[] = [];
	for (const habit of due) {
		if (habit.completions.includes(day)) doneNames.push(habit.name);
		else missedNames.push(habit.name);
	}
	return {
		completed: doneNames.length,
		total: due.length,
		doneNames,
		missedNames,
	};
}

export function toHabitView(
	habit: HabitRecord,
	day: DayKey,
	byId: Map<string, HabitRecord> = new Map(),
	allActive: HabitRecord[] = [...byId.values()],
): HabitView {
	const due = isHabitActiveOn(habit, day) && isDueOn(habit.schedule, day);
	const streak = streakOnSchedule(habit.completions, habit.schedule, day);
	const parent = habit.stackAfterId ? byId.get(habit.stackAfterId) : undefined;
	const stackAfterName = parent?.name ?? "";
	const stackLabel = stackAfterName ? `After ${stackAfterName}` : "";
	const archivedAt = habit.archivedAt ?? "";
	const archivedDay = archivedAt.slice(0, 10);
	const stackOrder = normalizeStackOrder(habit.stackOrder);
	return {
		id: habit.id,
		name: habit.name,
		cue: habit.cue,
		note: habit.note,
		color: resolveHabitColor(habit.color, habit.id),
		schedule: habit.schedule,
		scheduleLabel: scheduleLabel(habit.schedule),
		stackAfterId: habit.stackAfterId,
		stackAfterName,
		stackLabel,
		stackDepth: stackDepth(habit.id, byId),
		stackOrder,
		canMoveUp: canMoveStackUp(allActive, habit.id),
		canMoveDown: canMoveStackDown(allActive, habit.id),
		due,
		done: habit.completions.includes(day),
		streak,
		streakLabel: streak === 1 ? "Streak: 1 day" : `Streak: ${streak} days`,
		archived: isHabitArchived(habit),
		archivedAt,
		archiveNote: habit.archiveNote,
		archivedLabel:
			archivedDay && /^\d{4}-\d{2}-\d{2}$/.test(archivedDay) ? formatDayLabel(archivedDay) : "",
	};
}

export function toHabitViews(habits: HabitRecord[], day: DayKey): HabitView[] {
	const byId = new Map(habits.map((habit) => [habit.id, habit]));
	const active = habits.filter((habit) => !habit.archivedAt);
	return habits.map((habit) => toHabitView(habit, day, byId, active));
}

const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"] as const;

/** Habit × day matrix for a calendar month. */
export function buildHabitGraph(
	habits: HabitRecord[],
	year: number,
	month: number,
	todayKey: DayKey,
	selectedDay: DayKey,
	journaledDays: ReadonlySet<DayKey> | null = null,
	journalGraphSince: DayKey | null = null,
): HabitGraph {
	const days: HabitGraphDay[] = [];
	const count = daysInMonth(year, month);
	for (let dayNum = 1; dayNum <= count; dayNum += 1) {
		const day = localDayKey(new Date(year, month - 1, dayNum));
		days.push({
			day,
			weekday: WEEKDAY_LETTERS[mondayIndex(year, month, dayNum)] ?? "",
			dayNum: String(dayNum),
			isToday: day === todayKey,
			isSelected: day === selectedDay,
			label: formatDayLabel(day),
		});
	}

	const dayKeys = days.map((item) => item.day);
	const active = habits.filter((habit) => !habit.archivedAt);
	const archived = habits.filter((habit) => habit.archivedAt);
	const orderedActive = orderByStack(toHabitViews(active, selectedDay));
	const archivedRelevant = archived
		.filter((habit) =>
			dayKeys.some((day) => isHabitActiveOn(habit, day) && isDueOn(habit.schedule, day)),
		)
		.sort((a, b) => a.name.localeCompare(b.name));

	const rowHabits: HabitRecord[] = [
		...orderedActive
			.map((view) => active.find((habit) => habit.id === view.id))
			.filter((habit): habit is HabitRecord => Boolean(habit)),
		...archivedRelevant,
	];

	const rows: HabitGraphRow[] = rowHabits.map((habit) => {
		const completions = new Set(habit.completions);
		const streak = streakOnSchedule(habit.completions, habit.schedule, selectedDay);
		const cells: HabitGraphCell[] = dayKeys.map((day) => {
			const due = isHabitActiveOn(habit, day) && isDueOn(habit.schedule, day);
			const done = completions.has(day);
			const future = day > todayKey;
			const state = !due || (future && !done) ? "off" : done ? "done" : "missed";
			const status =
				state === "done" ? "done" : state === "missed" ? "missed" : future ? "upcoming" : "not due";
			return {
				key: `${habit.id}-${day}`,
				habitId: habit.id,
				day,
				state,
				done,
				label: `${habit.name} · ${formatDayLabel(day)} · ${status}`,
			};
		});
		return {
			habitId: habit.id,
			name: habit.name,
			color: resolveHabitColor(habit.color, habit.id),
			streak,
			streakLabel: streak === 1 ? "Streak: 1 day" : `Streak: ${streak} days`,
			cells,
		};
	});

	if (journaledDays) {
		rows.unshift(
			buildJournalGraphRow(
				dayKeys,
				journaledDays,
				todayKey,
				selectedDay,
				journalGraphSince ?? todayKey,
			),
		);
	}

	return { days, rows };
}

function journalStreakFromSince(
	journaledDays: ReadonlySet<DayKey>,
	since: DayKey,
	endDay: DayKey,
): number {
	let cursor = journaledDays.has(endDay) ? endDay : shiftDayKey(endDay, -1);
	if (cursor < since || !journaledDays.has(cursor)) {
		return 0;
	}
	let streak = 0;
	while (cursor >= since && journaledDays.has(cursor)) {
		streak += 1;
		cursor = shiftDayKey(cursor, -1);
	}
	return streak;
}

function buildJournalGraphRow(
	dayKeys: DayKey[],
	journaledDays: ReadonlySet<DayKey>,
	todayKey: DayKey,
	selectedDay: DayKey,
	journalSince: DayKey,
): HabitGraphRow {
	const streakEnd = selectedDay <= todayKey ? selectedDay : todayKey;
	const streak = journalStreakFromSince(journaledDays, journalSince, streakEnd);
	const cells: HabitGraphCell[] = dayKeys.map((day) => {
		const done = journaledDays.has(day);
		const tracking = day >= journalSince;
		const future = day > todayKey;
		const state = (!tracking && !done) || (future && !done) ? "off" : done ? "done" : "missed";
		const status = state === "done" ? "journaled" : state === "missed" ? "missed" : "upcoming";
		return {
			key: `${JOURNAL_GRAPH_ID}-${day}`,
			habitId: JOURNAL_GRAPH_ID,
			day,
			state,
			done,
			label: `${JOURNAL_GRAPH_NAME} · ${formatDayLabel(day)} · ${status}`,
		};
	});
	return {
		habitId: JOURNAL_GRAPH_ID,
		name: JOURNAL_GRAPH_NAME,
		color: JOURNAL_GRAPH_COLOR,
		streak,
		streakLabel: streak === 1 ? "Streak: 1 day" : `Streak: ${streak} days`,
		cells,
	};
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function buildMonthCalendar(
	habits: HabitRecord[],
	year: number,
	month: number,
	todayKey: DayKey,
	selectedKey: DayKey,
): CalendarCell[] {
	const cells: CalendarCell[] = [];
	const leading = mondayIndex(year, month, 1);
	for (let i = 0; i < leading; i += 1) {
		cells.push({
			key: `pad-${year}-${month}-${i}`,
			day: "",
			dayNum: "",
			empty: true,
			inMonth: false,
			isToday: false,
			isSelected: false,
			level: 0,
			label: "",
			completed: 0,
			total: 0,
			doneNames: [],
			missedNames: [],
		});
	}

	const count = daysInMonth(year, month);
	for (let dayNum = 1; dayNum <= count; dayNum += 1) {
		const day = localDayKey(new Date(year, month - 1, dayNum));
		const { completed, total, doneNames, missedNames } = dayStats(habits, day);
		const level = activityLevel(completed, total);
		cells.push({
			key: day,
			day,
			dayNum: String(dayNum),
			empty: false,
			inMonth: true,
			isToday: day === todayKey,
			isSelected: day === selectedKey,
			level,
			label: `${formatDayLabel(day)}: ${completed} of ${total} due`,
			completed,
			total,
			doneNames,
			missedNames,
		});
	}

	while (cells.length % 7 !== 0) {
		const i = cells.length;
		cells.push({
			key: `pad-end-${year}-${month}-${i}`,
			day: "",
			dayNum: "",
			empty: true,
			inMonth: false,
			isToday: false,
			isSelected: false,
			level: 0,
			label: "",
			completed: 0,
			total: 0,
			doneNames: [],
			missedNames: [],
		});
	}

	return cells;
}

export function buildTrackSnapshot(
	habits: HabitRecord[],
	selectedDay: DayKey,
	month: number,
	year: number,
	todayKey: DayKey = localDayKey(),
	identities: IdentityLink[] = [],
	journaledDays: ReadonlySet<DayKey> | null = null,
	journalGraphSince: DayKey | null = null,
	journalEntries: TrackSnapshot["journalEntries"] = [],
): TrackSnapshot {
	const views = orderByStack(toHabitViews(habits, selectedDay).filter((habit) => habit.due));
	const remaining = views.filter((habit) => !habit.done);
	const doneCount = views.length - remaining.length;
	const totalCount = views.length;
	const remainingCount = remaining.length;

	let summaryLabel = "Nothing scheduled";
	if (habits.length === 0 && !journaledDays) {
		summaryLabel = "No habits yet";
	} else if (totalCount > 0) {
		if (remainingCount === 0) {
			summaryLabel = selectedDay === todayKey ? "Complete" : "All done";
		} else if (selectedDay === todayKey) {
			summaryLabel = remainingCount === 1 ? "1 left" : `${remainingCount} left`;
		} else {
			summaryLabel = `${doneCount} of ${totalCount}`;
		}
	} else if (selectedDay === todayKey) {
		summaryLabel = "Nothing scheduled";
	} else {
		summaryLabel = "Nothing scheduled";
	}

	return {
		todayKey,
		selectedKey: selectedDay,
		selectedLabel: formatDayLabel(selectedDay),
		isSelectedToday: selectedDay === todayKey,
		summaryLabel,
		hasHabits: habits.length > 0 || Boolean(journaledDays),
		remainingCount,
		doneCount,
		totalCount,
		habits: views,
		remaining,
		groups: buildTrackGroups(views, identities, selectedDay === todayKey),
		habitGraph: buildHabitGraph(
			habits,
			year,
			month,
			todayKey,
			selectedDay,
			journaledDays,
			journalGraphSince,
		),
		weekdays: WEEKDAYS,
		calendarMonthLabel: formatMonthLabel(year, month),
		calendarYear: year,
		calendarMonth: month,
		calendarCells: buildMonthCalendar(habits, year, month, todayKey, selectedDay),
		journalEntries,
	};
}
