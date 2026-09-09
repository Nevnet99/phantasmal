/** Habit accent colors for graph cells, journal tags, and the create form. */

export const HABIT_PALETTE = [
	"#5b8c5a",
	"#3d8b9a",
	"#c4873a",
	"#b85c4a",
	"#6a7f4e",
	"#4f7cac",
	"#a66b3d",
	"#7a6a4f",
	"#2f8f7a",
	"#9a5b6e",
	"#5a7a3d",
	"#8b6b2f",
	"#4a6fa5",
	"#b36a4a",
	"#3f8f6b",
	"#8a5a8a",
] as const;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isHabitColor(value: unknown): value is string {
	return typeof value === "string" && HEX_RE.test(value);
}

/** Stable fallback for habits saved before color existed. */
export function fallbackHabitColor(id: string): string {
	let hash = 2166136261;
	for (let i = 0; i < id.length; i += 1) {
		hash ^= id.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	const index = (hash >>> 0) % HABIT_PALETTE.length;
	return HABIT_PALETTE[index] ?? HABIT_PALETTE[0];
}

export function randomHabitColor(): string {
	const index = Math.floor(Math.random() * HABIT_PALETTE.length);
	return HABIT_PALETTE[index] ?? HABIT_PALETTE[0];
}

export function resolveHabitColor(color: string | null | undefined, id: string): string {
	if (isHabitColor(color)) return color.toLowerCase();
	return fallbackHabitColor(id);
}

/** @deprecated Prefer resolveHabitColor(stored, id). Kept for call sites that only have an id. */
export function habitColor(id: string): string {
	return fallbackHabitColor(id);
}

export function habitColorStyle(color: string): string {
	return `--habit-color: ${color}`;
}
