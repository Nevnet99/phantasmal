/** Pure date/streak helpers for habit tracking (local YYYY-MM-DD keys). */

import type { DayKey } from "../shared/habits";

export function localDayKey(date = new Date()): DayKey {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function parseDayKey(day: DayKey): { year: number; month: number; day: number } {
	const [y, m, d] = day.split("-").map(Number);
	return { year: y, month: m, day: d };
}

export function shiftDayKey(day: DayKey, deltaDays: number): DayKey {
	const { year, month, day: d } = parseDayKey(day);
	const date = new Date(year, month - 1, d);
	date.setDate(date.getDate() + deltaDays);
	return localDayKey(date);
}

export function formatDayLabel(day: DayKey): string {
	const { year, month, day: d } = parseDayKey(day);
	const date = new Date(year, month - 1, d);
	return date.toLocaleDateString(undefined, {
		weekday: "long",
		month: "short",
		day: "numeric",
	});
}

export function formatMonthLabel(year: number, month: number): string {
	const date = new Date(year, month - 1, 1);
	return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function daysInMonth(year: number, month: number): number {
	return new Date(year, month, 0).getDate();
}

/** Monday = 0 … Sunday = 6 */
export function mondayIndex(year: number, month: number, day: number): number {
	const dow = new Date(year, month - 1, day).getDay();
	return (dow + 6) % 7;
}

/**
 * Streak ending on `today` if completed today, otherwise ending yesterday
 * if that day was completed; otherwise 0.
 */
export function streakEndingOn(completions: DayKey[], today: DayKey): number {
	const set = new Set(completions);
	let cursor = set.has(today) ? today : shiftDayKey(today, -1);
	if (!set.has(cursor)) {
		return 0;
	}

	let streak = 0;
	while (set.has(cursor)) {
		streak += 1;
		cursor = shiftDayKey(cursor, -1);
	}
	return streak;
}
