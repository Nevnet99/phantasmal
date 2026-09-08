import type { DayKey, HabitRecord } from "../shared/habits";

/** True when the habit still counts for tracking / due checks on `day`. */
export function isHabitActiveOn(habit: HabitRecord, day: DayKey): boolean {
	if (!habit.archivedAt) return true;
	const archivedDay = habit.archivedAt.slice(0, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(archivedDay)) return false;
	return day < archivedDay;
}

export function isHabitArchived(habit: HabitRecord): boolean {
	return Boolean(habit.archivedAt);
}
