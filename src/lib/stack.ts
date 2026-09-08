/** Habit stacking: “After [habit], I will [habit]” chains. */

import type { HabitRecord, HabitView } from "../shared/habits";

export function normalizeStackAfterId(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

/** True if linking `habitId` after `stackAfterId` would create a cycle. */
export function wouldCreateStackCycle(
	habits: HabitRecord[],
	habitId: string,
	stackAfterId: string | null,
): boolean {
	if (!stackAfterId) return false;
	if (stackAfterId === habitId) return true;

	const byId = new Map(habits.map((habit) => [habit.id, habit]));
	let cursor: string | null = stackAfterId;
	const seen = new Set<string>();
	while (cursor) {
		if (cursor === habitId) return true;
		if (seen.has(cursor)) return true;
		seen.add(cursor);
		cursor = byId.get(cursor)?.stackAfterId ?? null;
	}
	return false;
}

export function stackDepth(
	habitId: string,
	byId: Map<string, { stackAfterId: string | null }>,
): number {
	let depth = 0;
	let cursor = byId.get(habitId)?.stackAfterId ?? null;
	const seen = new Set<string>();
	while (cursor) {
		if (seen.has(cursor)) break;
		seen.add(cursor);
		depth += 1;
		cursor = byId.get(cursor)?.stackAfterId ?? null;
		if (depth > 20) break;
	}
	return depth;
}

/**
 * Order habits so each stack runs root → children, and sibling roots
 * stay name-sorted. Orphans (missing parent) behave as roots.
 */
export function orderByStack(habits: HabitView[]): HabitView[] {
	const byId = new Map(habits.map((habit) => [habit.id, habit]));
	const children = new Map<string, HabitView[]>();

	for (const habit of habits) {
		const parentId = habit.stackAfterId;
		if (parentId && byId.has(parentId)) {
			const list = children.get(parentId) ?? [];
			list.push(habit);
			children.set(parentId, list);
		}
	}

	for (const list of children.values()) {
		list.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
	}

	const roots = habits
		.filter((habit) => !habit.stackAfterId || !byId.has(habit.stackAfterId))
		.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

	const ordered: HabitView[] = [];
	const visited = new Set<string>();

	function walk(habit: HabitView): void {
		if (visited.has(habit.id)) return;
		visited.add(habit.id);
		ordered.push(habit);
		for (const child of children.get(habit.id) ?? []) {
			walk(child);
		}
	}

	for (const root of roots) {
		walk(root);
	}

	for (const habit of habits) {
		if (!visited.has(habit.id)) {
			ordered.push(habit);
		}
	}

	return ordered;
}
