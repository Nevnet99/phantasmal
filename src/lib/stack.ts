/** Habit stacking: “After [habit], I will [habit]” chains. */

import type { HabitRecord, HabitView } from "../shared/habits";

export function normalizeStackAfterId(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export function normalizeStackOrder(value: unknown): number {
	if (typeof value !== "number" || !Number.isFinite(value)) return 0;
	return Math.floor(value);
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

function compareStackOrder(
	a: { stackOrder: number; name: string; id: string },
	b: { stackOrder: number; name: string; id: string },
): number {
	if (a.stackOrder !== b.stackOrder) return a.stackOrder - b.stackOrder;
	return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}

/**
 * Order habits so each stack runs root → children, and sibling roots
 * stay stackOrder-sorted. Orphans (missing parent) behave as roots.
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
		list.sort(compareStackOrder);
	}

	const roots = habits
		.filter((habit) => !habit.stackAfterId || !byId.has(habit.stackAfterId))
		.sort(compareStackOrder);

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

/** Active siblings that share the same stackAfterId (including null roots). */
export function stackSiblings(habits: HabitRecord[], habitId: string): HabitRecord[] {
	const habit = habits.find((item) => item.id === habitId);
	if (!habit || habit.archivedAt) return [];
	return habits
		.filter((item) => !item.archivedAt && item.stackAfterId === habit.stackAfterId)
		.sort(compareStackOrder);
}

export function canMoveStackUp(habits: HabitRecord[], habitId: string): boolean {
	const habit = habits.find((item) => item.id === habitId);
	if (!habit || habit.archivedAt) return false;
	const siblings = stackSiblings(habits, habitId);
	const index = siblings.findIndex((item) => item.id === habitId);
	if (index > 0) return true;
	return Boolean(habit.stackAfterId && habits.some((item) => item.id === habit.stackAfterId));
}

export function canMoveStackDown(habits: HabitRecord[], habitId: string): boolean {
	const habit = habits.find((item) => item.id === habitId);
	if (!habit || habit.archivedAt) return false;
	const siblings = stackSiblings(habits, habitId);
	const index = siblings.findIndex((item) => item.id === habitId);
	if (index >= 0 && index < siblings.length - 1) return true;
	return habits.some((item) => !item.archivedAt && item.stackAfterId === habitId);
}

/**
 * Move a habit earlier/later among siblings, or promote/demote one step in a chain.
 * Returns the updated habit list (caller writes files).
 */
export function moveStackAmong(
	habits: HabitRecord[],
	habitId: string,
	direction: "up" | "down",
): HabitRecord[] {
	const byId = new Map(habits.map((habit) => [habit.id, { ...habit }]));
	const habit = byId.get(habitId);
	if (!habit || habit.archivedAt) {
		throw new Error("That habit can’t be moved.");
	}

	const siblings = [...byId.values()]
		.filter((item) => !item.archivedAt && item.stackAfterId === habit.stackAfterId)
		.sort(compareStackOrder);
	const index = siblings.findIndex((item) => item.id === habitId);

	if (direction === "up") {
		if (index > 0) {
			const prev = siblings[index - 1];
			if (!prev) throw new Error("That habit can’t be moved.");
			const order = habit.stackOrder;
			habit.stackOrder = prev.stackOrder;
			prev.stackOrder = order;
			byId.set(habit.id, habit);
			byId.set(prev.id, prev);
			return [...byId.values()];
		}

		const parent = habit.stackAfterId ? byId.get(habit.stackAfterId) : null;
		if (!parent || parent.archivedAt) {
			throw new Error("That habit can’t move up.");
		}
		// Promote: swap places with parent in the chain.
		habit.stackAfterId = parent.stackAfterId;
		parent.stackAfterId = habit.id;
		const order = habit.stackOrder;
		habit.stackOrder = parent.stackOrder;
		parent.stackOrder = order;
		byId.set(habit.id, habit);
		byId.set(parent.id, parent);
		return [...byId.values()];
	}

	if (index >= 0 && index < siblings.length - 1) {
		const next = siblings[index + 1];
		if (!next) throw new Error("That habit can’t be moved.");
		const order = habit.stackOrder;
		habit.stackOrder = next.stackOrder;
		next.stackOrder = order;
		byId.set(habit.id, habit);
		byId.set(next.id, next);
		return [...byId.values()];
	}

	const children = [...byId.values()]
		.filter((item) => !item.archivedAt && item.stackAfterId === habitId)
		.sort(compareStackOrder);
	const child = children[0];
	if (!child) {
		throw new Error("That habit can’t move down.");
	}
	// Demote: first child takes this habit’s place; habit stacks after that child.
	child.stackAfterId = habit.stackAfterId;
	habit.stackAfterId = child.id;
	const order = habit.stackOrder;
	habit.stackOrder = child.stackOrder;
	child.stackOrder = order;
	byId.set(habit.id, habit);
	byId.set(child.id, child);
	return [...byId.values()];
}
