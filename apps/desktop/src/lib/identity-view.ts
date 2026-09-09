/** Pure helpers for identity vote tallies and evidence. */

import type { DayKey } from "../shared/habits";
import type { IdentityEvidence } from "../shared/identity";
import { formatDayLabel, mondayIndex, parseDayKey, shiftDayKey } from "./day";

export type LinkedHabitVotes = {
	name: string;
	completions: string[];
};

const EVIDENCE_LIMIT = 5;

export function voteLabel(count: number): string {
	if (count === 1) return "1 vote";
	return `${count} votes`;
}

export function linkedLabel(names: string[]): string {
	if (names.length === 0) return "No habits linked";
	if (names.length === 1) return `Linked: ${names[0]}`;
	if (names.length === 2) return `Linked: ${names[0]}, ${names[1]}`;
	return `Linked: ${names[0]}, ${names[1]}, +${names.length - 2}`;
}

export function startOfWeekMonday(day: DayKey): DayKey {
	const { year, month, day: d } = parseDayKey(day);
	return shiftDayKey(day, -mondayIndex(year, month, d));
}

export function isInWeek(day: DayKey, weekContaining: DayKey): boolean {
	const start = startOfWeekMonday(weekContaining);
	const end = shiftDayKey(start, 6);
	return day >= start && day <= end;
}

const SHORT_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function shortWeekday(day: DayKey): string {
	const { year, month, day: d } = parseDayKey(day);
	return SHORT_WEEKDAYS[mondayIndex(year, month, d)];
}

export function periodLabel(votesToday: number, votesWeek: number): string {
	const todayPart = votesToday === 1 ? "1 today" : `${votesToday} today`;
	const weekPart = votesWeek === 1 ? "1 this week" : `${votesWeek} this week`;
	return `${todayPart} · ${weekPart}`;
}

export function tallyVotes(
	linked: LinkedHabitVotes[],
	today: DayKey,
): { voteCount: number; votesToday: number; votesWeek: number } {
	let voteCount = 0;
	let votesToday = 0;
	let votesWeek = 0;
	for (const habit of linked) {
		for (const day of habit.completions) {
			voteCount += 1;
			if (day === today) votesToday += 1;
			if (isInWeek(day, today)) votesWeek += 1;
		}
	}
	return { voteCount, votesToday, votesWeek };
}

export function buildEvidence(
	linked: LinkedHabitVotes[],
	limit = EVIDENCE_LIMIT,
): IdentityEvidence[] {
	const rows: IdentityEvidence[] = [];
	for (const habit of linked) {
		for (const day of habit.completions) {
			rows.push({
				day,
				habitName: habit.name,
				label: `${habit.name} · ${shortWeekday(day)}`,
			});
		}
	}
	rows.sort((a, b) => b.day.localeCompare(a.day) || a.habitName.localeCompare(b.habitName));
	return rows.slice(0, limit);
}

export function archivedDayLabel(archivedAt: string | null | undefined): string {
	const archivedDay = (archivedAt ?? "").slice(0, 10);
	return archivedDay && /^\d{4}-\d{2}-\d{2}$/.test(archivedDay) ? formatDayLabel(archivedDay) : "";
}

export function votesOpenLabel(openCount: number, isToday: boolean): string {
	if (openCount <= 0) return "";
	const when = isToday ? " today" : "";
	if (openCount === 1) return `1 vote still open${when}`;
	return `${openCount} votes still open${when}`;
}
