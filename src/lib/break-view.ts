import type { BreakLaw, BreakRecord, BreakView } from "../shared/break";
import type { DayKey } from "../shared/habits";
import { formatDayLabel, streakEndingOn } from "./day";
import { resolveHabitColor } from "./habit-color";

function dayFromIso(value: string): DayKey | null {
	const day = value.slice(0, 10);
	return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

/** True when the break counts for clean-day tracking on `day`. */
export function isBreakActiveOn(record: BreakRecord, day: DayKey): boolean {
	const createdDay = dayFromIso(record.createdAt);
	if (createdDay && day < createdDay) {
		return false;
	}

	if (!record.archivedAt) return true;
	const archivedDay = dayFromIso(record.archivedAt);
	if (!archivedDay) return false;
	return day < archivedDay;
}

const LAW_META: {
	id: BreakLaw["id"];
	title: string;
	prompt: string;
	field: keyof Pick<BreakRecord, "invisible" | "unattractive" | "difficult" | "unsatisfying">;
}[] = [
	{
		id: "invisible",
		title: "Make it invisible",
		prompt: "Hide or avoid the cue.",
		field: "invisible",
	},
	{
		id: "unattractive",
		title: "Make it unattractive",
		prompt: "Reframe the craving.",
		field: "unattractive",
	},
	{
		id: "difficult",
		title: "Make it difficult",
		prompt: "Add friction to the response.",
		field: "difficult",
	},
	{
		id: "unsatisfying",
		title: "Make it unsatisfying",
		prompt: "Add a cost or accountability.",
		field: "unsatisfying",
	},
];

export function buildBreakLaws(record: BreakRecord): BreakLaw[] {
	return LAW_META.map((law) => {
		const body = record[law.field].trim();
		return {
			id: law.id,
			title: law.title,
			prompt: law.prompt,
			body,
			filled: Boolean(body),
		};
	});
}

export function lawsLabel(filled: number): string {
	if (filled === 0) return "No inversion plan yet";
	if (filled === 4) return "All four laws inverted";
	return `${filled} of 4 laws inverted`;
}

export function linkedReplacementLabel(names: string[]): string {
	if (names.length === 0) return "No replacement habit linked";
	if (names.length === 1) return `Instead: ${names[0]}`;
	if (names.length === 2) return `Instead: ${names[0]} · ${names[1]}`;
	return `Instead: ${names[0]} · ${names[1]} · +${names.length - 2}`;
}

export function archivedDayLabel(archivedAt: string | null): string {
	if (!archivedAt) return "";
	const day = archivedAt.slice(0, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "Archived";
	return `Archived ${formatDayLabel(day)}`;
}

export function toBreakView(
	record: BreakRecord,
	today: string,
	habitsById: Map<string, { name: string; archived: boolean }>,
): BreakView {
	const replacementNames = record.replacementHabitIds
		.map((id) => habitsById.get(id)?.name)
		.filter((name): name is string => Boolean(name));
	const laws = buildBreakLaws(record);
	const lawsFilled = laws.filter((law) => law.filled).length;
	const streak = streakEndingOn(record.cleanDays, today);
	return {
		id: record.id,
		name: record.name,
		cue: record.cue,
		note: record.note,
		color: resolveHabitColor(record.color, record.id),
		invisible: record.invisible,
		unattractive: record.unattractive,
		difficult: record.difficult,
		unsatisfying: record.unsatisfying,
		replacementHabitIds: [...record.replacementHabitIds],
		replacementNames,
		linkedLabel: linkedReplacementLabel(replacementNames),
		laws,
		lawsFilled,
		lawsLabel: lawsLabel(lawsFilled),
		cleanDays: [...record.cleanDays],
		cleanToday: record.cleanDays.includes(today),
		streak,
		streakLabel: streak === 1 ? "1 clean day" : `${streak} clean days`,
		archived: Boolean(record.archivedAt),
		archivedAt: record.archivedAt ?? "",
		archiveNote: record.archiveNote,
		archivedLabel: archivedDayLabel(record.archivedAt),
	};
}
