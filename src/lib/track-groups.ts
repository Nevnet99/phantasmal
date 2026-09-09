import type { HabitView, TrackGroup } from "../shared/habits";
import { votesOpenLabel } from "./identity-view";
import { orderByStack } from "./stack";

export type IdentityLink = {
	id: string;
	statement: string;
	habitIds: string[];
};

function stackRootId(habit: HabitView, byId: Map<string, HabitView>): string {
	let current = habit;
	const seen = new Set<string>();
	while (current.stackAfterId && byId.has(current.stackAfterId) && !seen.has(current.id)) {
		seen.add(current.id);
		const parent = byId.get(current.stackAfterId);
		if (!parent) break;
		current = parent;
	}
	return current.id;
}

function familyMemberIds(rootId: string, byId: Map<string, HabitView>): string[] {
	const ids: string[] = [];
	const children = new Map<string, HabitView[]>();
	for (const habit of byId.values()) {
		if (habit.stackAfterId && byId.has(habit.stackAfterId)) {
			const list = children.get(habit.stackAfterId) ?? [];
			list.push(habit);
			children.set(habit.stackAfterId, list);
		}
	}
	function walk(id: string): void {
		ids.push(id);
		for (const child of children.get(id) ?? []) {
			walk(child.id);
		}
	}
	walk(rootId);
	return ids;
}

function firstLinkedIdentity(ids: string[], identities: IdentityLink[]): IdentityLink | null {
	for (const identity of identities) {
		if (ids.some((id) => identity.habitIds.includes(id))) {
			return identity;
		}
	}
	return null;
}

function withVotesOpen(group: Omit<TrackGroup, "votesOpenLabel">, isToday: boolean): TrackGroup {
	const open = group.identityId ? group.habits.filter((habit) => !habit.done).length : 0;
	return {
		...group,
		votesOpenLabel: votesOpenLabel(open, isToday),
	};
}

/**
 * Group due habits by identity. Whole stack families stay in one group,
 * keyed by the first linked identity among the family (statement-sorted identities).
 */
export function buildTrackGroups(
	habits: HabitView[],
	identities: IdentityLink[],
	isToday = true,
): TrackGroup[] {
	const ordered = orderByStack(habits);
	if (ordered.length === 0) return [];

	const sortedIdentities = [...identities].sort(
		(a, b) => a.statement.localeCompare(b.statement) || a.id.localeCompare(b.id),
	);
	const byId = new Map(ordered.map((habit) => [habit.id, habit]));
	const dueIds = new Set(ordered.map((habit) => habit.id));

	if (sortedIdentities.length === 0) {
		return [withVotesOpen({ key: "all", title: "", identityId: null, habits: ordered }, isToday)];
	}

	const buckets = new Map<string, Omit<TrackGroup, "votesOpenLabel">>();
	const assigned = new Set<string>();

	for (const habit of ordered) {
		if (assigned.has(habit.id)) continue;
		const rootId = stackRootId(habit, byId);
		const familyIds = familyMemberIds(rootId, byId).filter((id) => dueIds.has(id));
		const family = familyIds
			.map((id) => byId.get(id))
			.filter((item): item is HabitView => Boolean(item));
		const identity = firstLinkedIdentity(familyIds, sortedIdentities);
		const key = identity?.id ?? "other";
		const existing = buckets.get(key) ?? {
			key,
			title: identity?.statement ?? "Other habits",
			identityId: identity?.id ?? null,
			habits: [],
		};
		for (const member of family) {
			if (assigned.has(member.id)) continue;
			existing.habits.push(member);
			assigned.add(member.id);
		}
		buckets.set(key, existing);
	}

	const groups: TrackGroup[] = [];
	for (const identity of sortedIdentities) {
		const group = buckets.get(identity.id);
		if (group && group.habits.length > 0) {
			groups.push(withVotesOpen({ ...group, habits: orderByStack(group.habits) }, isToday));
		}
	}
	const other = buckets.get("other");
	if (other && other.habits.length > 0) {
		groups.push(withVotesOpen({ ...other, habits: orderByStack(other.habits) }, isToday));
	}
	return groups;
}
