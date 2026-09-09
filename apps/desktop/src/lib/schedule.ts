/** Habit recurrence helpers: due days, labels, streaks. */

import type { DayKey, HabitSchedule, Weekday } from "../shared/habits";
import { WEEKDAY_LABELS } from "../shared/habits";
import { parseDayKey, shiftDayKey } from "./day";

export type { HabitSchedule, Weekday } from "../shared/habits";

export function mondayOfWeek(day: DayKey): DayKey {
	const { year, month, day: d } = parseDayKey(day);
	const date = new Date(year, month - 1, d);
	const sundayBased = date.getDay();
	const mondayBased = (sundayBased + 6) % 7;
	return shiftDayKey(day, -mondayBased);
}

export function weekdayMondayBased(day: DayKey): Weekday {
	const { year, month, day: d } = parseDayKey(day);
	const sundayBased = new Date(year, month - 1, d).getDay();
	return ((sundayBased + 6) % 7) as Weekday;
}

export function daysBetween(a: DayKey, b: DayKey): number {
	const pa = parseDayKey(a);
	const pb = parseDayKey(b);
	const ms = Date.UTC(pb.year, pb.month - 1, pb.day) - Date.UTC(pa.year, pa.month - 1, pa.day);
	return Math.round(ms / 86_400_000);
}

export function isWeekday(value: unknown): value is Weekday {
	return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6;
}

export function normalizeSchedule(value: unknown, fallbackAnchor: DayKey): HabitSchedule {
	if (!value || typeof value !== "object") {
		return { type: "daily" };
	}
	const record = value as Record<string, unknown>;
	if (record.type === "daily") {
		return { type: "daily" };
	}
	if (record.type === "weekly") {
		const weekdays = Array.isArray(record.weekdays)
			? [...new Set(record.weekdays.filter(isWeekday))].sort((a, b) => a - b)
			: [];
		const intervalWeeks =
			typeof record.intervalWeeks === "number" &&
			Number.isInteger(record.intervalWeeks) &&
			record.intervalWeeks >= 1
				? Math.min(record.intervalWeeks, 12)
				: 1;
		const anchorDay =
			typeof record.anchorDay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(record.anchorDay)
				? record.anchorDay
				: fallbackAnchor;
		if (weekdays.length === 0) {
			return { type: "daily" };
		}
		return { type: "weekly", weekdays, intervalWeeks, anchorDay };
	}
	if (record.type === "every_n_days") {
		const intervalDays =
			typeof record.intervalDays === "number" &&
			Number.isInteger(record.intervalDays) &&
			record.intervalDays >= 2
				? Math.min(record.intervalDays, 365)
				: 2;
		const anchorDay =
			typeof record.anchorDay === "string" && /^\d{4}-\d{2}-\d{2}$/.test(record.anchorDay)
				? record.anchorDay
				: fallbackAnchor;
		return { type: "every_n_days", intervalDays, anchorDay };
	}
	return { type: "daily" };
}

export function isDueOn(schedule: HabitSchedule, day: DayKey): boolean {
	if (schedule.type === "daily") {
		return true;
	}
	if (schedule.type === "every_n_days") {
		const delta = daysBetween(schedule.anchorDay, day);
		return delta >= 0 && delta % schedule.intervalDays === 0;
	}

	const weekday = weekdayMondayBased(day);
	if (!schedule.weekdays.includes(weekday)) {
		return false;
	}
	if (schedule.intervalWeeks <= 1) {
		return true;
	}
	const anchorMonday = mondayOfWeek(schedule.anchorDay);
	const dayMonday = mondayOfWeek(day);
	const weekDelta = daysBetween(anchorMonday, dayMonday) / 7;
	if (!Number.isInteger(weekDelta) || weekDelta < 0) {
		return false;
	}
	return weekDelta % schedule.intervalWeeks === 0;
}

export function previousDueOnOrBefore(schedule: HabitSchedule, day: DayKey): DayKey | null {
	for (let i = 0; i < 400; i += 1) {
		const candidate = shiftDayKey(day, -i);
		if (isDueOn(schedule, candidate)) {
			return candidate;
		}
	}
	return null;
}

export function previousDueBefore(schedule: HabitSchedule, day: DayKey): DayKey | null {
	return previousDueOnOrBefore(schedule, shiftDayKey(day, -1));
}

export function streakOnSchedule(
	completions: DayKey[],
	schedule: HabitSchedule,
	day: DayKey,
): number {
	const set = new Set(completions);
	let cursor = isDueOn(schedule, day) && set.has(day) ? day : previousDueBefore(schedule, day);
	if (!cursor || !set.has(cursor)) {
		return 0;
	}

	let streak = 0;
	while (cursor && set.has(cursor)) {
		streak += 1;
		cursor = previousDueBefore(schedule, cursor);
	}
	return streak;
}

export function scheduleLabel(schedule: HabitSchedule): string {
	if (schedule.type === "daily") {
		return "Every day";
	}
	if (schedule.type === "every_n_days") {
		return schedule.intervalDays === 2 ? "Every other day" : `Every ${schedule.intervalDays} days`;
	}
	const days = schedule.weekdays.map((day) => WEEKDAY_LABELS[day]).join(", ");
	if (schedule.intervalWeeks === 1) {
		return schedule.weekdays.length === 7 ? "Every day" : `Weekly · ${days}`;
	}
	if (schedule.intervalWeeks === 2) {
		return `Every other week · ${days}`;
	}
	return `Every ${schedule.intervalWeeks} weeks · ${days}`;
}
