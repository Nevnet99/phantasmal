import type { DayKey, HabitRecord } from "../shared/habits";

function dayFromIso(value: string): DayKey | null {
	const day = value.slice(0, 10);
	return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

/** True when the habit counts for tracking / due checks on `day`. */
export function isHabitActiveOn(habit: HabitRecord, day: DayKey): boolean {
	const createdDay = dayFromIso(habit.createdAt);
	if (createdDay && day < createdDay) {
		return false;
	}

	if (!habit.archivedAt) return true;
	const archivedDay = dayFromIso(habit.archivedAt);
	if (!archivedDay) return false;
	return day < archivedDay;
}

export function isHabitArchived(habit: HabitRecord): boolean {
	return Boolean(habit.archivedAt);
}
