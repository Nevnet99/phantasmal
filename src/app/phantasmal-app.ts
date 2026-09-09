import type {
	CalendarCell,
	HabitGraphCell,
	HabitSchedule,
	HabitView,
	TrackSnapshot,
	Weekday,
} from "@/shared/habits";
import { JOURNAL_GRAPH_ID, WEEKDAY_LABELS } from "@/shared/habits";
import type { BreakHabitOption, BreakView } from "@/shared/break";
import type { IdentityHabitOption, IdentityView } from "@/shared/identity";
import {
	JOURNAL_MOODS,
	type JournalHabitOption,
	type JournalHabitTag,
	type JournalMoodId,
	type JournalSummary,
} from "@/shared/journal";
import type { VaultStatus } from "@/shared/vault";
import type { AppPrefs, TrackViz, UiDensity, UiTheme } from "@/shared/prefs";
import { formatDayLabel, localDayKey, parseDayKey, shiftDayKey } from "@/lib/day";
import { isHabitColor, randomHabitColor } from "@/lib/habit-color";
import { filterHabitTagSuggestions, habitTagSlug } from "@/lib/journal-markdown";
import { fireTodayCompleteCelebration } from "@/lib/celebrate";
import { trapDialogFocus, type DialogFocusSession } from "@/lib/dialog-a11y";
import type { DsMarkdownEditor } from "@/design-system/components/markdown-editor";
import { NAV_ITEMS, isAppRoute, navItemById, type AppRoute, type NavItem } from "./nav";

export type AppScreen = "loading" | "welcome" | "setup" | "app";
export type SettingsTab = "ui" | "vault" | "habits";
export type ResolvedTheme = "light" | "dark";
export type ScheduleKind = "daily" | "weekly" | "every_n_days";
export type TrackVizMode = TrackViz;

export type DayPopState = {
	open: boolean;
	ready: boolean;
	top: number;
	left: number;
	anchorX: number;
	anchorTop: number;
	anchorBottom: number;
	placement: "above" | "below";
	title: string;
	completed: number;
	total: number;
	doneNames: string[];
	missedNames: string[];
};

function emptyDayPop(): DayPopState {
	return {
		open: false,
		ready: false,
		top: 0,
		left: 0,
		anchorX: 0,
		anchorTop: 0,
		anchorBottom: 0,
		placement: "above",
		title: "",
		completed: 0,
		total: 0,
		doneNames: [],
		missedNames: [],
	};
}

const DAY_POP_MARGIN = 8;
const DAY_POP_GAP = 8;
const DAY_POP_MAX_WIDTH = 288;

function openNativePicker(input: HTMLInputElement | undefined): void {
	if (!(input instanceof HTMLInputElement)) return;
	if (typeof input.showPicker === "function") {
		try {
			input.showPicker();
			return;
		} catch {
			// Fall through to focus/click for older Chromium builds.
		}
	}
	input.focus();
	input.click();
}

function estimateDayPopSize(
	doneCount: number,
	missedCount: number,
): {
	width: number;
	height: number;
} {
	const viewW = window.innerWidth;
	const width = Math.min(DAY_POP_MAX_WIDTH, Math.max(160, viewW - DAY_POP_MARGIN * 2));
	let height = 52;
	if (doneCount > 0) height += 6 + doneCount * 20;
	if (missedCount > 0) height += 6 + missedCount * 20;
	return { width, height };
}

function computeDayPopPosition(input: {
	anchorX: number;
	anchorTop: number;
	anchorBottom: number;
	width: number;
	height: number;
}): { top: number; left: number; placement: "above" | "below" } {
	const viewW = window.innerWidth;
	const viewH = window.innerHeight;
	const width = Math.min(input.width, viewW - DAY_POP_MARGIN * 2);
	const height = Math.min(input.height, viewH - DAY_POP_MARGIN * 2);

	let left = input.anchorX - width / 2;
	left = Math.min(Math.max(left, DAY_POP_MARGIN), viewW - DAY_POP_MARGIN - width);

	let placement: "above" | "below" = "above";
	let top = input.anchorTop - DAY_POP_GAP - height;
	if (top < DAY_POP_MARGIN) {
		placement = "below";
		top = input.anchorBottom + DAY_POP_GAP;
	}
	if (top + height > viewH - DAY_POP_MARGIN) {
		top = Math.max(DAY_POP_MARGIN, viewH - DAY_POP_MARGIN - height);
	}

	return { top, left, placement };
}

function emptyWeekdays(): boolean[] {
	return [false, false, false, false, false, false, false];
}

function emptyTrack(): TrackSnapshot {
	const today = localDayKey();
	const { year, month } = parseDayKey(today);
	return {
		todayKey: today,
		selectedKey: today,
		selectedLabel: formatDayLabel(today),
		isSelectedToday: true,
		summaryLabel: "No habits yet",
		hasHabits: false,
		remainingCount: 0,
		doneCount: 0,
		totalCount: 0,
		habits: [],
		remaining: [],
		groups: [],
		habitGraph: { days: [], rows: [], sections: [] },
		weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
		calendarMonthLabel: "",
		calendarYear: year,
		calendarMonth: month,
		calendarCells: [],
		journalEntries: [],
		breaks: [],
	};
}

type PhantasmalApp = {
	$refs?: {
		trackMonth?: HTMLInputElement;
		journalDay?: HTMLInputElement;
	};
	screen: AppScreen;
	route: AppRoute;
	settingsTab: SettingsTab;
	uiDensity: UiDensity;
	uiTheme: UiTheme;
	dailyReminder: boolean;
	journalOnGraph: boolean;
	systemPrefersDark: boolean;
	status: VaultStatus | null;
	busy: boolean;
	habitsBusy: boolean;
	habits: HabitView[];
	archivedHabits: HabitView[];
	habitsError: string;
	todayKey: string;
	todayLabel: string;
	selectedDay: string;
	calendarYear: number;
	calendarMonth: number;
	track: TrackSnapshot;
	trackViz: TrackVizMode;
	dayPop: DayPopState;
	celebrateOpen: boolean;
	celebrateMessage: string;
	celebrateTimer: number;
	removeDialogOpen: boolean;
	removeDialogKind: "habit" | "identity" | "break" | "journal";
	removeDialogId: string;
	removeDialogName: string;
	removeArchiveNote: string;
	removeBusy: boolean;
	removeDialogFocus: DialogFocusSession | null;
	createName: string;
	createCue: string;
	createNote: string;
	createColor: string;
	createError: string;
	editingId: string | null;
	stackAfterId: string;
	scheduleKind: ScheduleKind;
	scheduleWeekdays: boolean[];
	scheduleIntervalWeeks: number;
	scheduleIntervalDays: number;
	scheduleAnchorDay: string;
	weekdayLabels: readonly string[];
	weekdayOptions: { index: number; label: string }[];
	identities: IdentityView[];
	archivedIdentities: IdentityView[];
	identityHabitOptions: IdentityHabitOption[];
	identitiesBusy: boolean;
	identityError: string;
	identityEditingId: string | null;
	identityBody: string;
	identityNote: string;
	identityHabitIds: string[];
	identityBusy: boolean;
	breaks: BreakView[];
	archivedBreaks: BreakView[];
	breakHabitOptions: BreakHabitOption[];
	breakError: string;
	breakEditingId: string | null;
	breakName: string;
	breakCue: string;
	breakNote: string;
	breakColor: string;
	breakInvisible: string;
	breakUnattractive: string;
	breakDifficult: string;
	breakUnsatisfying: string;
	breakHabitIds: string[];
	breakBusy: boolean;
	breakTodayKey: string;
	journalDay: string;
	journalEntryId: string;
	/** True while writing a new entry that is not saved yet. */
	journalComposing: boolean;
	journalMood: JournalMoodId | null;
	journalTitle: string;
	journalBody: string;
	journalHabits: JournalHabitTag[];
	journalDayEntries: JournalSummary[];
	journalRecent: JournalSummary[];
	journalHabitOptions: JournalHabitOption[];
	journalMoods: typeof JOURNAL_MOODS;
	journalError: string;
	journalBusy: boolean;
	journalSaving: boolean;
	journalSaveTimer: number;
	journalTagQuery: string;
	journalTagOpen: boolean;
	navItems: NavItem[];
	get isLoading(): boolean;
	get isWelcome(): boolean;
	get isSetup(): boolean;
	get isApp(): boolean;
	get isTrack(): boolean;
	get isCreate(): boolean;
	get isJournal(): boolean;
	get isIdentity(): boolean;
	get isBreak(): boolean;
	get isSettings(): boolean;
	get isSettingsUi(): boolean;
	get isSettingsVault(): boolean;
	get isSettingsHabits(): boolean;
	get hasArchivedHabits(): boolean;
	get hasArchivedIdentities(): boolean;
	get hasArchivedBreaks(): boolean;
	get identityEmpty(): boolean;
	get breakEmpty(): boolean;
	get removeDialogTitle(): string;
	get removeDialogCopy(): string;
	get removeDialogKeepLabel(): string;
	get isRemoveHabit(): boolean;
	get isRemoveIdentity(): boolean;
	get isRemoveJournal(): boolean;
	get canDeleteJournalEntry(): boolean;
	get hasIdentityHabitOptions(): boolean;
	get isIdentityEditing(): boolean;
	get identityFormTitle(): string;
	get identitySubmitLabel(): string;
	get hasBreakHabitOptions(): boolean;
	get isBreakEditing(): boolean;
	get breakFormTitle(): string;
	get breakSubmitLabel(): string;
	get breakPreviewName(): string;
	get journalDayLabel(): string;
	get journalDayValue(): string;
	get journalIsToday(): boolean;
	get journalStatusLabel(): string;
	get hasJournalDayEntries(): boolean;
	get journalDayEmpty(): boolean;
	get journalShowEditor(): boolean;
	get journalEmptyLabel(): string;
	get hasJournalRecent(): boolean;
	get hasJournalHabits(): boolean;
	get hasJournalTagSuggestions(): boolean;
	get journalTagSuggestions(): JournalHabitOption[];
	get isStub(): boolean;
	get isDensityCompact(): boolean;
	get isDensityComfortable(): boolean;
	get isDensityRoomy(): boolean;
	get isThemeSystem(): boolean;
	get isThemeLight(): boolean;
	get isThemeDark(): boolean;
	get isDailyReminderOn(): boolean;
	get isDailyReminderOff(): boolean;
	get isJournalOnGraph(): boolean;
	get resolvedTheme(): ResolvedTheme;
	get hasStackOptions(): boolean;
	get stackOptions(): { id: string; name: string }[];
	get trackEmpty(): boolean;
	get nothingDue(): boolean;
	get hasTrackHabitsDue(): boolean;
	get hasTrackBreaks(): boolean;
	get hasTrackJournalEntries(): boolean;
	get hasRemaining(): boolean;
	get isEditing(): boolean;
	get isScheduleDaily(): boolean;
	get isScheduleWeekly(): boolean;
	get isScheduleEveryNDays(): boolean;
	get isTrackGraph(): boolean;
	get isTrackCalendar(): boolean;
	get habitGraphStyle(): string;
	get trackMonthValue(): string;
	get dayPopStyle(): string;
	get dayPopSummary(): string;
	get dayPopHasDone(): boolean;
	get dayPopHasMissed(): boolean;
	get dayPopBelow(): boolean;
	get dayPopReady(): boolean;
	get formTitle(): string;
	get formSubmitLabel(): string;
	get createTagSlug(): string;
	get createPreviewName(): string;
	get currentLabel(): string;
	get currentBlurb(): string;
	get defaultPathLabel(): string;
	get readyLabel(): string;
	get errorLabel(): string;
	get showReady(): boolean;
	get showError(): boolean;
	get vaultPathLabel(): string;
	init(): Promise<void>;
	bindSystemTheme(): void;
	applyTheme(): void;
	startSetup(): void;
	setupLocally(): Promise<void>;
	enterApp(): void;
	goTo(id: AppRoute): void;
	backToTrack(): void;
	isActive(id: AppRoute): boolean;
	setSettingsTab(tab: SettingsTab): void;
	applyPrefs(prefs: AppPrefs): void;
	setDensity(density: UiDensity): Promise<void>;
	setTheme(theme: UiTheme): Promise<void>;
	setDailyReminder(enabled: boolean): Promise<void>;
	setTrackViz(mode: TrackVizMode): Promise<void>;
	setJournalOnGraph(enabled: boolean): Promise<void>;
	openTrackVizSettings(): void;
	syncReminders(): void;
	refreshHabits(): Promise<void>;
	refreshArchivedHabits(): Promise<void>;
	refreshTrack(): Promise<void>;
	restoreArchivedHabit(id: string): Promise<void>;
	selectDay(day: string): void;
	onHabitGraphCellClick(cell: HabitGraphCell): void;
	onHabitGraphRowLabelClick(habitId: string): void;
	openTrackJournalEntry(entry: JournalSummary): void;
	openTrackJournalDay(day: string): void;
	shiftMonth(delta: number): void;
	openTrackMonthPicker(): void;
	onTrackMonthChange(event: Event): void;
	goToToday(): void;
	showDayPop(event: Event, cell: CalendarCell): void;
	placeDayPop(): void;
	hideDayPop(): void;
	habitGraphCellClass(cell: HabitGraphCell): string;
	habitGraphDayClass(day: { isToday: boolean; isSelected: boolean }): string;
	isJournalGraphRow(row: { habitId: string; kind?: string }): boolean;
	isBreakGraphRow(row: { habitId: string; kind?: string }): boolean;
	isGraphRowLink(row: { habitId: string; kind?: string }): boolean;
	graphRowLinkTitle(row: { habitId: string; kind?: string }): string;
	calendarCellClass(cell: CalendarCell): string;
	habitRowClass(habit: HabitView): string;
	habitRowWrapClass(habit: HabitView): string;
	setScheduleKind(kind: ScheduleKind): void;
	toggleScheduleWeekday(index: number): void;
	isScheduleWeekdayOn(index: number): boolean;
	buildSchedule(): HabitSchedule;
	resetScheduleForm(): void;
	loadScheduleForm(schedule: HabitSchedule): void;
	startEdit(habit: HabitView): void;
	cancelEdit(): void;
	setCreateColor(color: string): void;
	applyCreateColorToPicker(): void;
	syncCreateColorFromPicker(): void;
	onCreateColorChange(event: Event): void;
	saveHabitForm(): Promise<void>;
	createHabit(): Promise<void>;
	toggleHabit(id: string): Promise<void>;
	moveStack(id: string, direction: "up" | "down"): Promise<void>;
	openRemoveDialog(habit: HabitView): void;
	openIdentityRemoveDialog(identity: IdentityView): void;
	openBreakRemoveDialog(item: BreakView): void;
	openJournalRemoveDialog(): void;
	closeRemoveDialog(): void;
	confirmArchiveHabit(): Promise<void>;
	confirmArchiveIdentity(): Promise<void>;
	confirmArchiveBreak(): Promise<void>;
	confirmDeleteHabit(): Promise<void>;
	confirmDeleteIdentity(): Promise<void>;
	confirmDeleteBreak(): Promise<void>;
	confirmDeleteJournal(): Promise<void>;
	celebrateTodayComplete(): void;
	dismissCelebrate(): void;
	refreshIdentities(): Promise<void>;
	refreshArchivedIdentities(): Promise<void>;
	restoreArchivedIdentity(id: string): Promise<void>;
	resetIdentityForm(): void;
	startIdentityEdit(identity: IdentityView): void;
	cancelIdentityEdit(): void;
	toggleIdentityHabit(id: string): void;
	isIdentityHabitLinked(id: string): boolean;
	identityHabitOptionClass(option: IdentityHabitOption): string;
	saveIdentityForm(): Promise<void>;
	refreshBreaks(): Promise<void>;
	refreshArchivedBreaks(): Promise<void>;
	restoreArchivedBreak(id: string): Promise<void>;
	resetBreakForm(): void;
	startBreakEdit(item: BreakView): void;
	cancelBreakEdit(): void;
	saveBreakForm(): Promise<void>;
	toggleBreakClean(id: string): Promise<void>;
	toggleBreakHabit(id: string): void;
	isBreakHabitLinked(id: string): boolean;
	breakHabitOptionClass(option: BreakHabitOption): string;
	syncBreakColorFromPicker(): void;
	onBreakColorChange(event: Event): void;
	applyBreakColorToPicker(): void;
	breakCardClass(item: BreakView): string;
	breakCheckClass(item: BreakView): string;
	refreshJournal(): Promise<void>;
	selectJournalDay(day: string): void;
	selectJournalEntry(id: string): void;
	selectJournalRecent(entry: JournalSummary): void;
	startNewJournalEntry(): void;
	isJournalEntryActive(id: string): boolean;
	journalEntryButtonClass(entry: JournalSummary): string;
	shiftJournalDay(delta: number): void;
	goJournalToday(): void;
	openJournalDayPicker(): void;
	onJournalDayChange(event: Event): void;
	setJournalMood(mood: JournalMoodId): void;
	isJournalMood(mood: JournalMoodId): boolean;
	moodButtonClass(mood: JournalMoodId): string;
	scheduleJournalSave(): void;
	saveJournalNow(): Promise<void>;
	onJournalEditorChange(event: Event): void;
	onJournalTagQuery(event: Event): void;
	insertJournalHabitTag(option: JournalHabitOption): void;
	syncJournalEditorHabits(): void;
	closeJournalTagMenu(): void;
	journalHashTag(tag: string): string;
	chooseFolder(): Promise<void>;
	openExisting(): Promise<void>;
	reveal(): Promise<void>;
	run(action: () => Promise<VaultStatus>): Promise<void>;
};

function unavailableStatus(): VaultStatus {
	return {
		configured: false,
		path: null,
		open: false,
		schemaVersion: null,
		defaultPath: "(unavailable outside Electron)",
		error: "Vault API is only available in the Electron app.",
	};
}

export function phantasmalApp(): PhantasmalApp {
	const initial = emptyTrack();
	return {
		screen: "loading",
		route: "track",
		settingsTab: "ui",
		uiDensity: "compact",
		uiTheme: "dark",
		dailyReminder: true,
		journalOnGraph: false,
		systemPrefersDark: true,
		status: null,
		busy: false,
		habitsBusy: false,
		habits: [],
		archivedHabits: [],
		habitsError: "",
		todayKey: initial.todayKey,
		todayLabel: formatDayLabel(initial.todayKey),
		selectedDay: initial.selectedKey,
		calendarYear: initial.calendarYear,
		calendarMonth: initial.calendarMonth,
		track: initial,
		trackViz: "graph",
		dayPop: emptyDayPop(),
		celebrateOpen: false,
		celebrateMessage: "",
		celebrateTimer: 0,
		removeDialogOpen: false,
		removeDialogKind: "habit",
		removeDialogId: "",
		removeDialogName: "",
		removeArchiveNote: "",
		removeBusy: false,
		removeDialogFocus: null,
		createName: "",
		createCue: "",
		createNote: "",
		createColor: randomHabitColor(),
		createError: "",
		editingId: null,
		stackAfterId: "",
		scheduleKind: "daily",
		scheduleWeekdays: emptyWeekdays(),
		scheduleIntervalWeeks: 1,
		scheduleIntervalDays: 2,
		scheduleAnchorDay: initial.todayKey,
		weekdayLabels: WEEKDAY_LABELS,
		weekdayOptions: WEEKDAY_LABELS.map((label, index) => ({ index, label })),
		identities: [],
		archivedIdentities: [],
		identityHabitOptions: [],
		identitiesBusy: false,
		identityError: "",
		identityEditingId: null,
		identityBody: "",
		identityNote: "",
		identityHabitIds: [],
		identityBusy: false,
		breaks: [],
		archivedBreaks: [],
		breakHabitOptions: [],
		breakError: "",
		breakEditingId: null,
		breakName: "",
		breakCue: "",
		breakNote: "",
		breakColor: randomHabitColor(),
		breakInvisible: "",
		breakUnattractive: "",
		breakDifficult: "",
		breakUnsatisfying: "",
		breakHabitIds: [],
		breakBusy: false,
		breakTodayKey: initial.todayKey,
		journalDay: initial.todayKey,
		journalEntryId: "",
		journalComposing: false,
		journalMood: null,
		journalTitle: "",
		journalBody: "",
		journalHabits: [],
		journalDayEntries: [],
		journalRecent: [],
		journalHabitOptions: [],
		journalMoods: JOURNAL_MOODS,
		journalError: "",
		journalBusy: false,
		journalSaving: false,
		journalSaveTimer: 0,
		journalTagQuery: "",
		journalTagOpen: false,
		navItems: NAV_ITEMS,

		get isLoading() {
			return this.screen === "loading";
		},

		get isWelcome() {
			return this.screen === "welcome";
		},

		get isSetup() {
			return this.screen === "setup";
		},

		get isApp() {
			return this.screen === "app";
		},

		get isTrack() {
			return this.route === "track";
		},

		get isCreate() {
			return this.route === "create";
		},

		get isJournal() {
			return this.route === "journal";
		},

		get isIdentity() {
			return this.route === "identity";
		},

		get isBreak() {
			return this.route === "break";
		},

		get isSettings() {
			return this.route === "settings";
		},

		get isSettingsUi() {
			return this.settingsTab === "ui";
		},

		get isSettingsVault() {
			return this.settingsTab === "vault";
		},

		get isSettingsHabits() {
			return this.settingsTab === "habits";
		},

		get hasArchivedHabits() {
			return this.archivedHabits.length > 0;
		},

		get hasArchivedIdentities() {
			return this.archivedIdentities.length > 0;
		},

		get hasArchivedBreaks() {
			return this.archivedBreaks.length > 0;
		},

		get identityEmpty() {
			return !this.identitiesBusy && this.identities.length === 0;
		},

		get breakEmpty() {
			return !this.breakBusy && this.breaks.length === 0;
		},

		get removeDialogTitle() {
			if (this.removeDialogKind === "identity") return "Remove identity?";
			if (this.removeDialogKind === "break") return "Remove break?";
			if (this.removeDialogKind === "journal") return "Delete entry?";
			return "Remove habit?";
		},

		get removeDialogCopy() {
			if (this.removeDialogKind === "identity") {
				return `${this.removeDialogName} can be archived so you can restore it later, or deleted forever.`;
			}
			if (this.removeDialogKind === "break") {
				return `${this.removeDialogName} can be archived so you can restore it later, or deleted forever.`;
			}
			if (this.removeDialogKind === "journal") {
				return `${this.removeDialogName} will be deleted forever. This cannot be undone.`;
			}
			return `${this.removeDialogName} can be archived so past check-offs stay on your graphs, or deleted forever.`;
		},

		get removeDialogKeepLabel() {
			if (this.removeDialogKind === "identity") return "Keep identity";
			if (this.removeDialogKind === "break") return "Keep break";
			if (this.removeDialogKind === "journal") return "Keep entry";
			return "Keep habit";
		},

		get isRemoveHabit() {
			return this.removeDialogKind === "habit";
		},

		get isRemoveIdentity() {
			return this.removeDialogKind === "identity";
		},

		get isRemoveJournal() {
			return this.removeDialogKind === "journal";
		},

		get canDeleteJournalEntry() {
			return this.journalShowEditor && Boolean(this.journalEntryId) && !this.journalComposing;
		},

		get hasIdentityHabitOptions() {
			return this.identityHabitOptions.length > 0;
		},

		get isIdentityEditing() {
			return Boolean(this.identityEditingId);
		},

		get identityFormTitle() {
			return this.identityEditingId ? "Edit identity" : "New identity";
		},

		get identitySubmitLabel() {
			return this.identityEditingId ? "Save changes" : "Add identity";
		},

		get hasBreakHabitOptions() {
			return this.breakHabitOptions.length > 0;
		},

		get isBreakEditing() {
			return Boolean(this.breakEditingId);
		},

		get breakFormTitle() {
			return this.breakEditingId ? "Edit break" : "New break";
		},

		get breakSubmitLabel() {
			return this.breakEditingId ? "Save changes" : "Add break";
		},

		get breakPreviewName() {
			return this.breakName.trim() || "Bad habit name";
		},

		get journalDayLabel() {
			return formatDayLabel(this.journalDay);
		},

		get journalDayValue() {
			return this.journalDay;
		},

		get journalIsToday() {
			return this.journalDay === this.todayKey;
		},

		get journalStatusLabel() {
			if (this.journalSaving) return "Saving…";
			if (this.journalDayEmpty) return "No entries";
			if (this.journalComposing) return "New entry";
			if (this.journalHabits.length === 1) return `1 tagged`;
			if (this.journalHabits.length > 1) return `${this.journalHabits.length} tagged`;
			return "Markdown styles as you type";
		},

		get hasJournalDayEntries() {
			return this.journalDayEntries.length > 0;
		},

		get journalDayEmpty() {
			return !this.journalBusy && !this.hasJournalDayEntries && !this.journalComposing;
		},

		get journalShowEditor() {
			return this.journalComposing || Boolean(this.journalEntryId);
		},

		get journalEmptyLabel() {
			return this.journalIsToday
				? "You have no journal entries today."
				: `No journal entries for ${this.journalDayLabel}.`;
		},

		get hasJournalRecent() {
			return this.journalRecent.length > 0;
		},

		get hasJournalHabits() {
			return this.journalHabits.length > 0;
		},

		get hasJournalTagSuggestions() {
			return this.journalTagOpen && this.journalTagSuggestions.length > 0;
		},

		get journalTagSuggestions() {
			return filterHabitTagSuggestions(this.journalTagQuery, this.journalHabitOptions);
		},

		get isStub() {
			const item = navItemById(this.route);
			return Boolean(item && !item.enabled);
		},

		get isDensityCompact() {
			return this.uiDensity === "compact";
		},

		get isDensityComfortable() {
			return this.uiDensity === "comfortable";
		},

		get isDensityRoomy() {
			return this.uiDensity === "roomy";
		},

		get isThemeSystem() {
			return this.uiTheme === "system";
		},

		get isThemeLight() {
			return this.uiTheme === "light";
		},

		get isThemeDark() {
			return this.uiTheme === "dark";
		},

		get isDailyReminderOn() {
			return this.dailyReminder;
		},

		get isDailyReminderOff() {
			return !this.dailyReminder;
		},

		get isJournalOnGraph() {
			return this.journalOnGraph;
		},

		get resolvedTheme() {
			if (this.uiTheme === "light") return "light";
			if (this.uiTheme === "dark") return "dark";
			return this.systemPrefersDark ? "dark" : "light";
		},

		get hasStackOptions() {
			return this.stackOptions.length > 0;
		},

		get stackOptions() {
			const editingId = this.editingId;
			return this.habits
				.filter((habit) => habit.id !== editingId)
				.map((habit) => ({ id: habit.id, name: habit.name }));
		},

		get trackEmpty() {
			return !this.habitsBusy && !this.track.hasHabits;
		},

		get nothingDue() {
			return !this.habitsBusy && this.track.hasHabits && this.track.totalCount === 0;
		},

		get hasTrackHabitsDue() {
			return this.track.habits.length > 0;
		},

		get hasTrackBreaks() {
			return this.track.breaks.length > 0;
		},

		get hasTrackJournalEntries() {
			return this.track.journalEntries.length > 0;
		},

		get hasRemaining() {
			return this.track.remainingCount > 0 && this.track.isSelectedToday;
		},

		get isEditing() {
			return this.editingId !== null;
		},

		get isScheduleDaily() {
			return this.scheduleKind === "daily";
		},

		get isScheduleWeekly() {
			return this.scheduleKind === "weekly";
		},

		get isScheduleEveryNDays() {
			return this.scheduleKind === "every_n_days";
		},

		get isTrackGraph() {
			return this.trackViz === "graph";
		},

		get isTrackCalendar() {
			return this.trackViz === "calendar";
		},

		get habitGraphStyle() {
			const cols = this.track.habitGraph.days.length || 31;
			return `--habit-graph-cols: ${cols}`;
		},

		get trackMonthValue() {
			const month = String(this.calendarMonth).padStart(2, "0");
			return `${this.calendarYear}-${month}`;
		},

		get dayPopStyle() {
			return `top: ${this.dayPop.top}px; left: ${this.dayPop.left}px;`;
		},

		get dayPopSummary() {
			if (this.dayPop.total === 0) return "Nothing scheduled";
			return `${this.dayPop.completed} of ${this.dayPop.total} due`;
		},

		get dayPopHasDone() {
			return this.dayPop.doneNames.length > 0;
		},

		get dayPopHasMissed() {
			return this.dayPop.missedNames.length > 0;
		},

		get dayPopBelow() {
			return this.dayPop.placement === "below";
		},

		get dayPopReady() {
			return this.dayPop.ready;
		},

		get formTitle() {
			return this.editingId ? "Edit habit" : "Create";
		},

		get formSubmitLabel() {
			return this.editingId ? "Save changes" : "Create habit";
		},

		get createTagSlug() {
			return habitTagSlug(this.createName.trim() || "habit");
		},

		get createPreviewName() {
			return this.createName.trim() || "Habit name";
		},

		get currentLabel() {
			return navItemById(this.route)?.label ?? "Phantasmal";
		},

		get currentBlurb() {
			return navItemById(this.route)?.blurb ?? "";
		},

		get defaultPathLabel() {
			return this.status?.defaultPath ?? "Documents/Phantasmal";
		},

		get readyLabel() {
			return this.status?.path ? `Ready · ${this.status.path}` : "";
		},

		get errorLabel() {
			return this.status?.error ?? "";
		},

		get showReady() {
			return Boolean(this.status?.open && this.status.schemaVersion !== null);
		},

		get showError() {
			return Boolean(this.status?.error);
		},

		get vaultPathLabel() {
			return this.status?.path ?? "";
		},

		bindSystemTheme() {
			const mq = window.matchMedia("(prefers-color-scheme: dark)");
			this.systemPrefersDark = mq.matches;
			mq.addEventListener("change", (event) => {
				this.systemPrefersDark = event.matches;
				this.applyTheme();
			});
		},

		applyTheme() {
			document.documentElement.dataset.theme = this.resolvedTheme;
		},

		async init() {
			this.bindSystemTheme();
			this.todayKey = localDayKey();
			this.todayLabel = formatDayLabel(this.todayKey);
			this.selectedDay = this.todayKey;
			const parts = parseDayKey(this.todayKey);
			this.calendarYear = parts.year;
			this.calendarMonth = parts.month;

			const api = window.phantasmal?.vault;
			const settings = window.phantasmal?.settings;
			if (settings) {
				this.applyPrefs(await settings.getPrefs());
			}
			this.applyTheme();

			if (!api) {
				this.status = unavailableStatus();
				this.screen = "welcome";
				return;
			}

			this.status = await api.getStatus();
			this.screen = this.status.open ? "app" : "welcome";
			this.route = "track";
			if (this.status.open) {
				await this.refreshHabits();
			}
		},

		startSetup() {
			this.screen = "setup";
		},

		async setupLocally() {
			const api = window.phantasmal?.vault;
			if (!api) return;
			this.busy = true;
			try {
				this.status = await api.useDefaultLocation();
				if (this.status.open) {
					this.screen = "app";
					this.route = "track";
					await this.refreshHabits();
				}
			} finally {
				this.busy = false;
			}
		},

		enterApp() {
			if (this.status?.open) {
				this.screen = "app";
				this.route = "track";
				void this.refreshHabits();
			}
		},

		goTo(id) {
			if (!isAppRoute(id)) return;
			this.route = id;
			if (id === "settings") {
				this.settingsTab = "ui";
			}
			if (id === "create" && !this.editingId) {
				this.createError = "";
				this.cancelEdit();
			}
			if (id === "track" || id === "create") {
				this.todayKey = localDayKey();
				this.todayLabel = formatDayLabel(this.todayKey);
				void this.refreshHabits();
			}
			if (id === "identity") {
				this.identityError = "";
				void this.refreshIdentities();
			}
			if (id === "break") {
				this.breakError = "";
				void this.refreshBreaks();
				this.applyBreakColorToPicker();
			}
			if (id === "journal") {
				this.journalError = "";
				this.todayKey = localDayKey();
				this.todayLabel = formatDayLabel(this.todayKey);
				if (!this.journalDay) this.journalDay = this.todayKey;
				void this.refreshJournal();
			}
		},

		backToTrack() {
			this.cancelEdit();
			this.goTo("track");
		},

		isActive(id) {
			return this.route === id;
		},

		setSettingsTab(tab) {
			this.settingsTab = tab;
			if (tab === "habits") {
				void this.refreshArchivedHabits();
				void this.refreshArchivedIdentities();
				void this.refreshArchivedBreaks();
			}
		},

		applyPrefs(prefs) {
			this.uiDensity = prefs.uiDensity;
			this.uiTheme = prefs.uiTheme;
			this.dailyReminder = prefs.dailyReminder;
			this.trackViz = prefs.trackViz;
			this.journalOnGraph = prefs.journalOnGraph;
		},

		async setDensity(density) {
			this.uiDensity = density;
			const settings = window.phantasmal?.settings;
			if (!settings) return;
			this.applyPrefs(await settings.setUiDensity(density));
		},

		async setTheme(theme) {
			this.uiTheme = theme;
			this.applyTheme();
			const settings = window.phantasmal?.settings;
			if (!settings) return;
			this.applyPrefs(await settings.setUiTheme(theme));
			this.applyTheme();
		},

		async setDailyReminder(enabled) {
			this.dailyReminder = enabled;
			const settings = window.phantasmal?.settings;
			if (!settings) return;
			this.applyPrefs(await settings.setDailyReminder(enabled));
			this.syncReminders();
		},

		async setTrackViz(mode) {
			this.trackViz = mode;
			const settings = window.phantasmal?.settings;
			if (!settings) return;
			this.applyPrefs(await settings.setTrackViz(mode));
		},

		async setJournalOnGraph(enabled) {
			this.journalOnGraph = enabled;
			const settings = window.phantasmal?.settings;
			if (!settings) {
				void this.refreshTrack().catch((error) => {
					this.habitsError = error instanceof Error ? error.message : String(error);
				});
				return;
			}
			this.applyPrefs(await settings.setJournalOnGraph(enabled));
			void this.refreshTrack().catch((error) => {
				this.habitsError = error instanceof Error ? error.message : String(error);
			});
		},

		openTrackVizSettings() {
			this.setSettingsTab("ui");
			this.goTo("settings");
		},

		syncReminders() {
			const reminders = window.phantasmal?.reminders;
			if (!reminders) return;
			void reminders.syncDueToday(this.track.remainingCount, this.track.todayKey);
		},

		async refreshHabits() {
			const api = window.phantasmal?.habits;
			if (!api) {
				this.habits = [];
				this.archivedHabits = [];
				this.track = emptyTrack();
				this.habitsError = "Habits API is only available in the Electron app.";
				return;
			}
			this.habitsBusy = true;
			this.habitsError = "";
			try {
				this.todayKey = localDayKey();
				this.todayLabel = formatDayLabel(this.todayKey);
				this.habits = await api.list(this.todayKey);
				await this.refreshTrack();
				if (this.isSettingsHabits) {
					await this.refreshArchivedHabits();
				}
			} catch (error) {
				this.habitsError = error instanceof Error ? error.message : String(error);
			} finally {
				this.habitsBusy = false;
			}
		},

		async refreshArchivedHabits() {
			const api = window.phantasmal?.habits;
			if (!api) {
				this.archivedHabits = [];
				return;
			}
			try {
				this.archivedHabits = await api.listArchived();
			} catch (error) {
				this.habitsError = error instanceof Error ? error.message : String(error);
			}
		},

		async refreshArchivedIdentities() {
			const api = window.phantasmal?.identity;
			if (!api) {
				this.archivedIdentities = [];
				return;
			}
			try {
				this.archivedIdentities = await api.listArchived();
			} catch (error) {
				this.identityError = error instanceof Error ? error.message : String(error);
			}
		},

		async restoreArchivedIdentity(id) {
			const api = window.phantasmal?.identity;
			if (!api) return;
			this.identityError = "";
			try {
				await api.restore(id);
				await this.refreshIdentities();
				await this.refreshArchivedIdentities();
				await this.refreshTrack();
			} catch (error) {
				this.identityError = error instanceof Error ? error.message : String(error);
			}
		},

		async refreshTrack() {
			const api = window.phantasmal?.habits;
			if (!api) return;
			const snap = await api.getTrack({
				selectedDay: this.selectedDay,
				month: this.calendarMonth,
				year: this.calendarYear,
				includeJournalGraph: this.journalOnGraph,
			});
			this.track = snap;
			this.todayKey = snap.todayKey;
			this.todayLabel = formatDayLabel(snap.todayKey);
			this.syncReminders();
		},

		async restoreArchivedHabit(id) {
			const api = window.phantasmal?.habits;
			if (!api) return;
			this.habitsError = "";
			try {
				await api.restore(id, this.todayKey);
				await this.refreshHabits();
				await this.refreshArchivedHabits();
			} catch (error) {
				this.habitsError = error instanceof Error ? error.message : String(error);
			}
		},

		selectDay(day) {
			if (!day) return;
			this.selectedDay = day;
			const parts = parseDayKey(day);
			this.calendarYear = parts.year;
			this.calendarMonth = parts.month;
			void this.refreshTrack().catch((error) => {
				this.habitsError = error instanceof Error ? error.message : String(error);
			});
		},

		onHabitGraphCellClick(cell) {
			if (!cell?.day) return;
			if (cell.habitId === JOURNAL_GRAPH_ID) {
				this.openTrackJournalDay(cell.day);
				return;
			}
			this.selectDay(cell.day);
		},

		onHabitGraphRowLabelClick(habitId) {
			if (habitId === JOURNAL_GRAPH_ID) {
				this.openTrackJournalDay(this.selectedDay);
				return;
			}
			const breakItem =
				this.track.breaks.find((item) => item.id === habitId) ??
				this.breaks.find((item) => item.id === habitId);
			if (breakItem) {
				this.startBreakEdit(breakItem);
			}
		},

		openTrackJournalEntry(entry) {
			if (!entry?.day || !entry.id) return;
			this.journalDay = entry.day;
			this.journalEntryId = entry.id;
			this.journalComposing = false;
			this.goTo("journal");
		},

		openTrackJournalDay(day) {
			if (!day) return;
			this.journalDay = day;
			this.journalEntryId = "";
			this.journalComposing = false;
			this.goTo("journal");
		},

		shiftMonth(delta) {
			let month = this.calendarMonth + delta;
			let year = this.calendarYear;
			if (month < 1) {
				month = 12;
				year -= 1;
			} else if (month > 12) {
				month = 1;
				year += 1;
			}
			this.calendarMonth = month;
			this.calendarYear = year;
			void this.refreshTrack().catch((error) => {
				this.habitsError = error instanceof Error ? error.message : String(error);
			});
		},

		openTrackMonthPicker() {
			openNativePicker(this.$refs?.trackMonth);
		},

		onTrackMonthChange(event) {
			const value = (event.target as HTMLInputElement).value;
			const match = /^(\d{4})-(\d{2})$/.exec(value);
			if (!match) return;
			const year = Number(match[1]);
			const month = Number(match[2]);
			if (!Number.isFinite(year) || month < 1 || month > 12) return;
			this.calendarYear = year;
			this.calendarMonth = month;
			void this.refreshTrack().catch((error) => {
				this.habitsError = error instanceof Error ? error.message : String(error);
			});
		},

		goToToday() {
			this.selectedDay = localDayKey();
			const parts = parseDayKey(this.selectedDay);
			this.calendarYear = parts.year;
			this.calendarMonth = parts.month;
			void this.refreshTrack().catch((error) => {
				this.habitsError = error instanceof Error ? error.message : String(error);
			});
		},

		showDayPop(event, cell) {
			if (cell.empty) return;
			if (!cell.day) return;
			const target = event.currentTarget;
			if (!(target instanceof HTMLElement)) return;
			const rect = target.getBoundingClientRect();
			const anchorX = rect.left + rect.width / 2;
			const anchorTop = rect.top;
			const anchorBottom = rect.bottom;
			const estimate = estimateDayPopSize(cell.doneNames.length, cell.missedNames.length);
			const placed = computeDayPopPosition({
				anchorX,
				anchorTop,
				anchorBottom,
				width: estimate.width,
				height: estimate.height,
			});

			this.dayPop = {
				open: true,
				ready: false,
				top: placed.top,
				left: placed.left,
				anchorX,
				anchorTop,
				anchorBottom,
				placement: placed.placement,
				title: formatDayLabel(cell.day),
				completed: cell.completed,
				total: cell.total,
				doneNames: cell.doneNames,
				missedNames: cell.missedNames,
			};

			requestAnimationFrame(() => {
				this.placeDayPop();
				if (this.dayPop.open && !this.dayPop.ready) {
					this.dayPop = { ...this.dayPop, ready: true };
				}
			});
		},

		placeDayPop() {
			if (!this.dayPop.open) return;
			const el = document.getElementById("day-pop");
			if (!(el instanceof HTMLElement)) return;

			const width = el.offsetWidth;
			const height = el.offsetHeight;
			if (width <= 0 || height <= 0) return;

			const placed = computeDayPopPosition({
				anchorX: this.dayPop.anchorX,
				anchorTop: this.dayPop.anchorTop,
				anchorBottom: this.dayPop.anchorBottom,
				width,
				height,
			});

			this.dayPop = {
				...this.dayPop,
				top: placed.top,
				left: placed.left,
				placement: placed.placement,
				ready: true,
			};
		},

		hideDayPop() {
			this.dayPop = emptyDayPop();
		},

		habitGraphCellClass(cell) {
			return `habit-graph__cell habit-graph__cell--${cell.state}`;
		},

		habitGraphDayClass(day) {
			const parts = ["habit-graph__day"];
			if (day.isToday) parts.push("habit-graph__day--today");
			if (day.isSelected) parts.push("habit-graph__day--selected");
			return parts.join(" ");
		},

		isJournalGraphRow(row) {
			return row.kind === "journal" || row.habitId === JOURNAL_GRAPH_ID;
		},

		isBreakGraphRow(row) {
			return row.kind === "break";
		},

		isGraphRowLink(row) {
			return this.isJournalGraphRow(row) || this.isBreakGraphRow(row);
		},

		graphRowLinkTitle(row) {
			if (this.isJournalGraphRow(row)) return "Open journal";
			if (this.isBreakGraphRow(row)) return "Edit break";
			return row.habitId;
		},

		calendarCellClass(cell) {
			const parts = ["cal__day"];
			if (cell.empty) parts.push("cal__day--empty");
			if (cell.isToday) parts.push("cal__day--today");
			if (cell.isSelected) parts.push("cal__day--selected");
			if (!cell.empty) parts.push(`cal__day--l${cell.level}`);
			return parts.join(" ");
		},

		habitRowClass(habit) {
			const parts = ["habit-list__item"];
			if (habit.done) parts.push("habit-list__item--done");
			return parts.join(" ");
		},

		habitRowWrapClass(habit) {
			const parts = ["habit-list__row"];
			if (habit.stackDepth > 0) {
				parts.push("habit-list__row--stacked");
				parts.push(`habit-list__row--depth-${Math.min(habit.stackDepth, 3)}`);
			}
			return parts.join(" ");
		},

		setScheduleKind(kind) {
			this.scheduleKind = kind;
			if (kind === "weekly" && !this.scheduleWeekdays.some(Boolean)) {
				const days = emptyWeekdays();
				days[0] = true;
				this.scheduleWeekdays = days;
			}
		},

		toggleScheduleWeekday(index) {
			if (index < 0 || index > 6) return;
			const next = [...this.scheduleWeekdays];
			next[index] = !next[index];
			this.scheduleWeekdays = next;
		},

		isScheduleWeekdayOn(index) {
			return Boolean(this.scheduleWeekdays[index]);
		},

		buildSchedule() {
			const anchor = this.scheduleAnchorDay || this.selectedDay || localDayKey();
			if (this.scheduleKind === "weekly") {
				const weekdays = this.scheduleWeekdays
					.map((on, index) => (on ? (index as Weekday) : null))
					.filter((value): value is Weekday => value !== null);
				return {
					type: "weekly" as const,
					weekdays,
					intervalWeeks: Math.max(1, Math.min(12, Number(this.scheduleIntervalWeeks) || 1)),
					anchorDay: anchor,
				};
			}
			if (this.scheduleKind === "every_n_days") {
				return {
					type: "every_n_days" as const,
					intervalDays: Math.max(2, Math.min(365, Number(this.scheduleIntervalDays) || 2)),
					anchorDay: anchor,
				};
			}
			return { type: "daily" as const };
		},

		resetScheduleForm() {
			this.scheduleKind = "daily";
			this.scheduleWeekdays = emptyWeekdays();
			this.scheduleIntervalWeeks = 1;
			this.scheduleIntervalDays = 2;
			this.scheduleAnchorDay = this.selectedDay || localDayKey();
		},

		loadScheduleForm(schedule) {
			this.scheduleAnchorDay = this.selectedDay || localDayKey();
			if (schedule.type === "weekly") {
				this.scheduleKind = "weekly";
				const days = emptyWeekdays();
				for (const day of schedule.weekdays) {
					days[day] = true;
				}
				this.scheduleWeekdays = days;
				this.scheduleIntervalWeeks = schedule.intervalWeeks;
				this.scheduleAnchorDay = schedule.anchorDay;
				return;
			}
			if (schedule.type === "every_n_days") {
				this.scheduleKind = "every_n_days";
				this.scheduleIntervalDays = schedule.intervalDays;
				this.scheduleAnchorDay = schedule.anchorDay;
				this.scheduleWeekdays = emptyWeekdays();
				return;
			}
			this.resetScheduleForm();
		},

		startEdit(habit) {
			this.editingId = habit.id;
			this.createName = habit.name;
			this.createCue = habit.cue;
			this.createNote = habit.note;
			this.createColor = habit.color;
			this.stackAfterId = habit.stackAfterId ?? "";
			this.createError = "";
			this.loadScheduleForm(habit.schedule);
			this.route = "create";
			this.applyCreateColorToPicker();
		},

		cancelEdit() {
			this.editingId = null;
			this.createName = "";
			this.createCue = "";
			this.createNote = "";
			this.createColor = randomHabitColor();
			this.stackAfterId = "";
			this.createError = "";
			this.resetScheduleForm();
			this.applyCreateColorToPicker();
		},

		setCreateColor(color) {
			if (!isHabitColor(color)) return;
			this.createColor = color.toLowerCase();
		},

		applyCreateColorToPicker() {
			requestAnimationFrame(() => {
				const picker = document.querySelector("ds-color-picker");
				if (!picker || !("value" in picker)) return;
				(picker as HTMLElement & { value: string }).value = this.createColor;
			});
		},

		syncCreateColorFromPicker() {
			const picker = document.querySelector("ds-color-picker");
			if (!picker || !("value" in picker)) return;
			this.setCreateColor((picker as HTMLElement & { value: string }).value);
		},

		onCreateColorChange(event) {
			const detail = (event as CustomEvent<{ value: string }>).detail;
			const target = event.target as HTMLElement & { value?: string };
			const next = detail?.value || target?.value;
			if (!next) return;
			this.setCreateColor(next);
		},

		async saveHabitForm() {
			this.syncCreateColorFromPicker();
			if (this.editingId) {
				const api = window.phantasmal?.habits;
				if (!api) {
					this.createError = "Habits API is only available in the Electron app.";
					return;
				}
				const name = this.createName.trim();
				if (!name) {
					this.createError = "Name a habit before saving.";
					return;
				}
				this.habitsBusy = true;
				this.createError = "";
				try {
					await api.update(
						this.editingId,
						{
							name,
							cue: this.createCue.trim(),
							note: this.createNote.trim(),
							color: this.createColor,
							schedule: this.buildSchedule(),
							stackAfterId: this.stackAfterId || null,
						},
						this.selectedDay,
					);
					this.cancelEdit();
					await this.refreshHabits();
					this.route = "track";
				} catch (error) {
					this.createError = error instanceof Error ? error.message : String(error);
				} finally {
					this.habitsBusy = false;
				}
				return;
			}
			await this.createHabit();
		},

		async createHabit() {
			this.syncCreateColorFromPicker();
			const api = window.phantasmal?.habits;
			if (!api) {
				this.createError = "Habits API is only available in the Electron app.";
				return;
			}
			const name = this.createName.trim();
			if (!name) {
				this.createError = "Name a habit before saving.";
				return;
			}

			this.habitsBusy = true;
			this.createError = "";
			try {
				await api.create(
					{
						name,
						cue: this.createCue.trim(),
						note: this.createNote.trim(),
						color: this.createColor,
						schedule: this.buildSchedule(),
						stackAfterId: this.stackAfterId || null,
					},
					this.selectedDay,
				);
				this.createName = "";
				this.createCue = "";
				this.createNote = "";
				this.createColor = randomHabitColor();
				this.stackAfterId = "";
				this.editingId = null;
				this.resetScheduleForm();
				this.applyCreateColorToPicker();
				await this.refreshHabits();
				this.route = "track";
			} catch (error) {
				this.createError = error instanceof Error ? error.message : String(error);
			} finally {
				this.habitsBusy = false;
			}
		},

		async toggleHabit(id) {
			const api = window.phantasmal?.habits;
			if (!api) return;
			const habit = this.track.habits.find((item) => item.id === id);
			const markingDone = Boolean(habit && !habit.done);
			const clearingToday =
				this.track.isSelectedToday &&
				markingDone &&
				this.track.remainingCount === 1 &&
				this.track.totalCount > 0;

			this.habitsError = "";
			try {
				await api.toggleDay(id, this.selectedDay);
				await this.refreshTrack();
				if (clearingToday && this.track.remainingCount === 0 && this.track.totalCount > 0) {
					this.celebrateTodayComplete();
				}
			} catch (error) {
				this.habitsError = error instanceof Error ? error.message : String(error);
				await this.refreshHabits();
			}
		},

		async moveStack(id, direction) {
			const api = window.phantasmal?.habits;
			if (!api) return;
			this.habitsError = "";
			try {
				await api.moveStack(id, direction, this.selectedDay);
				await this.refreshTrack();
			} catch (error) {
				this.habitsError = error instanceof Error ? error.message : String(error);
				await this.refreshHabits();
			}
		},

		openRemoveDialog(habit) {
			this.removeDialogKind = "habit";
			this.removeDialogId = habit.id;
			this.removeDialogName = habit.name;
			this.removeArchiveNote = "";
			this.removeBusy = false;
			this.removeDialogOpen = true;
			this.hideDayPop();
			this.removeDialogFocus?.release();
			this.removeDialogFocus = null;
			requestAnimationFrame(() => {
				const panel = document.getElementById("remove-dialog");
				if (panel) {
					this.removeDialogFocus = trapDialogFocus(panel);
				}
			});
		},

		openIdentityRemoveDialog(identity) {
			this.removeDialogKind = "identity";
			this.removeDialogId = identity.id;
			this.removeDialogName = identity.statement;
			this.removeArchiveNote = "";
			this.removeBusy = false;
			this.removeDialogOpen = true;
			this.removeDialogFocus?.release();
			this.removeDialogFocus = null;
			requestAnimationFrame(() => {
				const panel = document.getElementById("remove-dialog");
				if (panel) {
					this.removeDialogFocus = trapDialogFocus(panel);
				}
			});
		},

		openBreakRemoveDialog(item) {
			this.removeDialogKind = "break";
			this.removeDialogId = item.id;
			this.removeDialogName = item.name;
			this.removeArchiveNote = "";
			this.removeBusy = false;
			this.removeDialogOpen = true;
			this.removeDialogFocus?.release();
			this.removeDialogFocus = null;
			requestAnimationFrame(() => {
				const panel = document.getElementById("remove-dialog");
				if (panel) {
					this.removeDialogFocus = trapDialogFocus(panel);
				}
			});
		},

		openJournalRemoveDialog() {
			if (!this.canDeleteJournalEntry) return;
			this.removeDialogKind = "journal";
			this.removeDialogId = this.journalEntryId;
			const title = this.journalTitle.trim();
			this.removeDialogName = title || "Untitled entry";
			this.removeArchiveNote = "";
			this.removeBusy = false;
			this.removeDialogOpen = true;
			this.removeDialogFocus?.release();
			this.removeDialogFocus = null;
			requestAnimationFrame(() => {
				const panel = document.getElementById("remove-dialog");
				if (panel) {
					this.removeDialogFocus = trapDialogFocus(panel);
				}
			});
		},

		closeRemoveDialog() {
			this.removeDialogFocus?.release();
			this.removeDialogFocus = null;
			this.removeDialogOpen = false;
			this.removeDialogKind = "habit";
			this.removeDialogId = "";
			this.removeDialogName = "";
			this.removeArchiveNote = "";
			this.removeBusy = false;
		},

		async confirmArchiveHabit() {
			if (this.removeDialogKind === "journal") return;
			if (this.removeDialogKind === "identity") {
				await this.confirmArchiveIdentity();
				return;
			}
			if (this.removeDialogKind === "break") {
				await this.confirmArchiveBreak();
				return;
			}
			const api = window.phantasmal?.habits;
			if (!api || !this.removeDialogId) return;
			this.removeBusy = true;
			this.habitsError = "";
			try {
				await api.archive(this.removeDialogId, this.removeArchiveNote, this.selectedDay);
				if (this.editingId === this.removeDialogId) {
					this.cancelEdit();
					this.route = "track";
				}
				this.closeRemoveDialog();
				await this.refreshHabits();
			} catch (error) {
				this.habitsError = error instanceof Error ? error.message : String(error);
				this.removeBusy = false;
			}
		},

		async confirmArchiveIdentity() {
			const api = window.phantasmal?.identity;
			if (!api || !this.removeDialogId) return;
			this.removeBusy = true;
			this.identityError = "";
			try {
				await api.archive(this.removeDialogId, this.removeArchiveNote);
				if (this.identityEditingId === this.removeDialogId) {
					this.resetIdentityForm();
				}
				this.closeRemoveDialog();
				await this.refreshIdentities();
				await this.refreshTrack();
			} catch (error) {
				this.identityError = error instanceof Error ? error.message : String(error);
				this.removeBusy = false;
			}
		},

		async confirmArchiveBreak() {
			const api = window.phantasmal?.breaks;
			if (!api || !this.removeDialogId) return;
			this.removeBusy = true;
			this.breakError = "";
			try {
				await api.archive(
					this.removeDialogId,
					this.removeArchiveNote,
					this.route === "track" ? this.selectedDay : this.breakTodayKey,
				);
				if (this.breakEditingId === this.removeDialogId) {
					this.resetBreakForm();
				}
				this.closeRemoveDialog();
				await this.refreshBreaks();
				void this.refreshTrack().catch(() => {
					/* Track refresh is best-effort after break archive. */
				});
			} catch (error) {
				this.breakError = error instanceof Error ? error.message : String(error);
				this.removeBusy = false;
			}
		},

		async confirmDeleteHabit() {
			if (this.removeDialogKind === "identity") {
				await this.confirmDeleteIdentity();
				return;
			}
			if (this.removeDialogKind === "break") {
				await this.confirmDeleteBreak();
				return;
			}
			if (this.removeDialogKind === "journal") {
				await this.confirmDeleteJournal();
				return;
			}
			const api = window.phantasmal?.habits;
			if (!api || !this.removeDialogId) return;
			this.removeBusy = true;
			this.habitsError = "";
			try {
				await api.remove(this.removeDialogId);
				if (this.editingId === this.removeDialogId) {
					this.cancelEdit();
					this.route = "track";
				}
				this.closeRemoveDialog();
				await this.refreshHabits();
			} catch (error) {
				this.habitsError = error instanceof Error ? error.message : String(error);
				this.removeBusy = false;
			}
		},

		async confirmDeleteIdentity() {
			const api = window.phantasmal?.identity;
			if (!api || !this.removeDialogId) return;
			this.removeBusy = true;
			this.identityError = "";
			try {
				await api.remove(this.removeDialogId);
				if (this.identityEditingId === this.removeDialogId) {
					this.resetIdentityForm();
				}
				this.closeRemoveDialog();
				await this.refreshIdentities();
				await this.refreshTrack();
			} catch (error) {
				this.identityError = error instanceof Error ? error.message : String(error);
				this.removeBusy = false;
			}
		},

		async confirmDeleteBreak() {
			const api = window.phantasmal?.breaks;
			if (!api || !this.removeDialogId) return;
			this.removeBusy = true;
			this.breakError = "";
			try {
				await api.remove(this.removeDialogId);
				if (this.breakEditingId === this.removeDialogId) {
					this.resetBreakForm();
				}
				this.closeRemoveDialog();
				await this.refreshBreaks();
				void this.refreshTrack().catch(() => {
					/* Track refresh is best-effort after break delete. */
				});
			} catch (error) {
				this.breakError = error instanceof Error ? error.message : String(error);
				this.removeBusy = false;
			}
		},

		async confirmDeleteJournal() {
			const api = window.phantasmal?.journal;
			if (!api || !this.removeDialogId) return;
			this.removeBusy = true;
			this.journalError = "";
			if (this.journalSaveTimer) {
				window.clearTimeout(this.journalSaveTimer);
				this.journalSaveTimer = 0;
			}
			try {
				await api.remove(this.removeDialogId);
				this.closeRemoveDialog();
				this.journalEntryId = "";
				this.journalComposing = false;
				this.journalMood = null;
				this.journalTitle = "";
				this.journalBody = "";
				this.journalHabits = [];
				this.closeJournalTagMenu();
				const editor = document.getElementById("journal-md") as DsMarkdownEditor | null;
				if (editor) editor.value = "";
				await this.refreshJournal();
				void this.refreshTrack().catch(() => {
					/* Track refresh is best-effort after journal delete. */
				});
			} catch (error) {
				this.journalError = error instanceof Error ? error.message : String(error);
				this.removeBusy = false;
			}
		},

		async refreshIdentities() {
			const api = window.phantasmal?.identity;
			if (!api) {
				this.identities = [];
				this.archivedIdentities = [];
				this.identityHabitOptions = [];
				this.identityError = "Identity API is only available in the Electron app.";
				return;
			}
			this.identitiesBusy = true;
			this.identityError = "";
			try {
				const snap = await api.list();
				this.identities = snap.identities;
				this.identityHabitOptions = snap.habitOptions;
			} catch (error) {
				this.identityError = error instanceof Error ? error.message : String(error);
			} finally {
				this.identitiesBusy = false;
			}
		},

		resetIdentityForm() {
			this.identityEditingId = null;
			this.identityBody = "";
			this.identityNote = "";
			this.identityHabitIds = [];
			this.identityBusy = false;
		},

		startIdentityEdit(identity) {
			this.identityEditingId = identity.id;
			this.identityBody = identity.statement.replace(/^i\s+am\s+/i, "").trim();
			this.identityNote = identity.note;
			this.identityHabitIds = [...identity.habitIds];
			this.identityError = "";
		},

		cancelIdentityEdit() {
			this.resetIdentityForm();
			this.identityError = "";
		},

		toggleIdentityHabit(id) {
			if (this.identityHabitIds.includes(id)) {
				this.identityHabitIds = this.identityHabitIds.filter((item) => item !== id);
			} else {
				this.identityHabitIds = [...this.identityHabitIds, id];
			}
		},

		isIdentityHabitLinked(id) {
			return this.identityHabitIds.includes(id);
		},

		identityHabitOptionClass(option) {
			const parts = ["identity-habit"];
			if (this.isIdentityHabitLinked(option.id)) parts.push("identity-habit--on");
			if (option.archived) parts.push("identity-habit--archived");
			return parts.join(" ");
		},

		async saveIdentityForm() {
			const api = window.phantasmal?.identity;
			if (!api) return;
			this.identityBusy = true;
			this.identityError = "";
			const draft = {
				statement: this.identityBody,
				note: this.identityNote,
				habitIds: [...this.identityHabitIds],
			};
			try {
				if (this.identityEditingId) {
					await api.update(this.identityEditingId, draft);
				} else {
					await api.create(draft);
				}
				this.resetIdentityForm();
				await this.refreshIdentities();
				await this.refreshTrack();
			} catch (error) {
				this.identityError = error instanceof Error ? error.message : String(error);
				this.identityBusy = false;
			}
		},

		async refreshBreaks() {
			const api = window.phantasmal?.breaks;
			if (!api) {
				this.breaks = [];
				this.archivedBreaks = [];
				this.breakHabitOptions = [];
				this.breakError = "Break API is only available in the Electron app.";
				return;
			}
			this.breakBusy = true;
			this.breakError = "";
			try {
				const snap = await api.list(localDayKey());
				this.breaks = snap.breaks;
				this.breakHabitOptions = snap.habitOptions;
				this.breakTodayKey = snap.todayKey;
			} catch (error) {
				this.breakError = error instanceof Error ? error.message : String(error);
			} finally {
				this.breakBusy = false;
			}
		},

		async refreshArchivedBreaks() {
			const api = window.phantasmal?.breaks;
			if (!api) {
				this.archivedBreaks = [];
				return;
			}
			try {
				this.archivedBreaks = await api.listArchived();
			} catch (error) {
				this.breakError = error instanceof Error ? error.message : String(error);
			}
		},

		async restoreArchivedBreak(id) {
			const api = window.phantasmal?.breaks;
			if (!api) return;
			this.breakError = "";
			try {
				await api.restore(id, this.breakTodayKey || localDayKey());
				await this.refreshBreaks();
				await this.refreshArchivedBreaks();
				void this.refreshTrack().catch(() => {
					/* Track refresh is best-effort after break restore. */
				});
			} catch (error) {
				this.breakError = error instanceof Error ? error.message : String(error);
			}
		},

		resetBreakForm() {
			this.breakEditingId = null;
			this.breakName = "";
			this.breakCue = "";
			this.breakNote = "";
			this.breakColor = randomHabitColor();
			this.breakInvisible = "";
			this.breakUnattractive = "";
			this.breakDifficult = "";
			this.breakUnsatisfying = "";
			this.breakHabitIds = [];
			this.breakBusy = false;
			this.applyBreakColorToPicker();
		},

		startBreakEdit(item) {
			this.breakEditingId = item.id;
			this.breakName = item.name;
			this.breakCue = item.cue;
			this.breakNote = item.note;
			this.breakColor = item.color;
			this.breakInvisible = item.invisible;
			this.breakUnattractive = item.unattractive;
			this.breakDifficult = item.difficult;
			this.breakUnsatisfying = item.unsatisfying;
			this.breakHabitIds = [...item.replacementHabitIds];
			this.breakError = "";
			this.route = "break";
			if (this.breakHabitOptions.length === 0) {
				void this.refreshBreaks();
			}
			this.applyBreakColorToPicker();
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					const form = document.querySelector(".break__form");
					form?.scrollIntoView({ block: "start", behavior: "smooth" });
					const name = document.querySelector<HTMLInputElement>('input[name="break-name"]');
					name?.focus();
				});
			});
		},

		cancelBreakEdit() {
			this.resetBreakForm();
			this.breakError = "";
		},

		toggleBreakHabit(id) {
			if (this.breakHabitIds.includes(id)) {
				this.breakHabitIds = this.breakHabitIds.filter((item) => item !== id);
			} else {
				this.breakHabitIds = [...this.breakHabitIds, id];
			}
		},

		isBreakHabitLinked(id) {
			return this.breakHabitIds.includes(id);
		},

		breakHabitOptionClass(option) {
			const parts = ["identity-habit", "break-habit"];
			if (this.isBreakHabitLinked(option.id)) parts.push("identity-habit--on");
			if (option.archived) parts.push("identity-habit--archived");
			return parts.join(" ");
		},

		applyBreakColorToPicker() {
			requestAnimationFrame(() => {
				const picker = document.getElementById("break-color-picker");
				if (!picker || !("value" in picker)) return;
				(picker as HTMLElement & { value: string }).value = this.breakColor;
			});
		},

		syncBreakColorFromPicker() {
			const picker = document.getElementById("break-color-picker");
			if (!picker || !("value" in picker)) return;
			const next = (picker as HTMLElement & { value: string }).value;
			if (!isHabitColor(next)) return;
			this.breakColor = next.toLowerCase();
		},

		onBreakColorChange(event) {
			const detail = (event as CustomEvent<{ value: string }>).detail;
			const target = event.target as HTMLElement & { value?: string };
			const next = detail?.value || target?.value;
			if (!next || !isHabitColor(next)) return;
			this.breakColor = next.toLowerCase();
		},

		breakCardClass(item) {
			const parts = ["break-card"];
			if (item.cleanToday) parts.push("break-card--clean");
			return parts.join(" ");
		},

		breakCheckClass(item) {
			const parts = ["habit-check"];
			if (item.cleanToday) parts.push("habit-check--done");
			return parts.join(" ");
		},

		async saveBreakForm() {
			const api = window.phantasmal?.breaks;
			if (!api) {
				this.breakError = "Break API is only available in the Electron app.";
				return;
			}
			this.syncBreakColorFromPicker();
			const name = this.breakName.trim();
			if (!name) {
				this.breakError = "Name the bad habit before saving.";
				return;
			}
			this.breakBusy = true;
			this.breakError = "";
			const draft = {
				name,
				cue: this.breakCue.trim(),
				note: this.breakNote.trim(),
				color: this.breakColor,
				invisible: this.breakInvisible.trim(),
				unattractive: this.breakUnattractive.trim(),
				difficult: this.breakDifficult.trim(),
				unsatisfying: this.breakUnsatisfying.trim(),
				replacementHabitIds: [...this.breakHabitIds],
			};
			try {
				const day = this.breakTodayKey || localDayKey();
				if (this.breakEditingId) {
					await api.update(this.breakEditingId, draft, day);
				} else {
					await api.create(draft, day);
				}
				this.resetBreakForm();
				await this.refreshBreaks();
				void this.refreshTrack().catch(() => {
					/* Track refresh is best-effort after break save. */
				});
			} catch (error) {
				this.breakError = error instanceof Error ? error.message : String(error);
				this.breakBusy = false;
			}
		},

		async toggleBreakClean(id) {
			const api = window.phantasmal?.breaks;
			if (!api) return;
			this.breakError = "";
			const day = this.route === "track" ? this.selectedDay : this.breakTodayKey || localDayKey();
			const item =
				this.route === "track"
					? this.track.breaks.find((breakItem) => breakItem.id === id)
					: this.breaks.find((breakItem) => breakItem.id === id);
			const markingClean = Boolean(item && !item.cleanToday);
			const clearingToday =
				day === localDayKey() &&
				markingClean &&
				this.track.remainingCount === 1 &&
				this.track.totalCount > 0;
			try {
				await api.toggleCleanDay(id, day);
				if (this.route === "break") {
					await this.refreshBreaks();
				}
				await this.refreshTrack();
				if (clearingToday && this.track.remainingCount === 0 && this.track.totalCount > 0) {
					this.celebrateTodayComplete();
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				this.breakError = message;
				this.habitsError = message;
				if (this.route === "break") {
					await this.refreshBreaks();
				}
				await this.refreshTrack();
			}
		},

		async refreshJournal() {
			const api = window.phantasmal?.journal;
			if (!api) {
				this.journalError = "Journal API is only available in the Electron app.";
				return;
			}
			this.journalBusy = true;
			this.journalError = "";
			try {
				const snap = await api.get({
					day: this.journalDay,
					entryId: this.journalComposing ? null : this.journalEntryId || null,
				});
				this.journalDayEntries = snap.dayEntries;
				this.journalRecent = snap.recent;
				this.journalHabitOptions = snap.habitOptions;
				this.syncJournalEditorHabits();
				this.closeJournalTagMenu();

				if (this.journalComposing) {
					return;
				}

				if (snap.dayEntries.length === 0) {
					this.journalEntryId = "";
					this.journalMood = null;
					this.journalTitle = "";
					this.journalBody = "";
					this.journalHabits = [];
					const editor = document.getElementById("journal-md") as DsMarkdownEditor | null;
					if (editor) editor.value = "";
					return;
				}

				this.journalEntryId = snap.entry.id;
				this.journalMood = snap.entry.mood;
				this.journalTitle = snap.entry.title;
				this.journalBody = snap.entry.body;
				this.journalHabits = snap.entry.habits;
			} catch (error) {
				this.journalError = error instanceof Error ? error.message : String(error);
			} finally {
				this.journalBusy = false;
			}
		},

		selectJournalDay(day) {
			if (!day) return;
			void this.saveJournalNow().finally(() => {
				this.journalDay = day;
				this.journalEntryId = "";
				this.journalComposing = false;
				void this.refreshJournal();
			});
		},

		selectJournalEntry(id) {
			if (!id || (id === this.journalEntryId && !this.journalComposing)) return;
			void this.saveJournalNow().finally(() => {
				this.journalEntryId = id;
				this.journalComposing = false;
				void this.refreshJournal();
			});
		},

		selectJournalRecent(entry) {
			if (!entry?.day) return;
			void this.saveJournalNow().finally(() => {
				this.journalDay = entry.day;
				this.journalEntryId = entry.id;
				this.journalComposing = false;
				void this.refreshJournal();
			});
		},

		startNewJournalEntry() {
			void this.saveJournalNow().finally(() => {
				this.journalComposing = true;
				this.journalEntryId = "";
				this.journalMood = null;
				this.journalTitle = "";
				this.journalBody = "";
				this.journalHabits = [];
				this.closeJournalTagMenu();
				const editor = document.getElementById("journal-md") as DsMarkdownEditor | null;
				if (editor) editor.value = "";
				void this.refreshJournal();
			});
		},

		isJournalEntryActive(id) {
			return !this.journalComposing && Boolean(id) && id === this.journalEntryId;
		},

		journalEntryButtonClass(entry) {
			const parts = ["journal-day-entries__item"];
			if (this.isJournalEntryActive(entry.id)) parts.push("journal-day-entries__item--active");
			return parts.join(" ");
		},

		shiftJournalDay(delta) {
			this.selectJournalDay(shiftDayKey(this.journalDay, delta));
		},

		goJournalToday() {
			this.selectJournalDay(localDayKey());
		},

		openJournalDayPicker() {
			openNativePicker(this.$refs?.journalDay);
		},

		onJournalDayChange(event) {
			const value = (event.target as HTMLInputElement).value;
			if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
			this.selectJournalDay(value);
		},

		setJournalMood(mood) {
			this.journalMood = this.journalMood === mood ? null : mood;
			this.scheduleJournalSave();
		},

		isJournalMood(mood) {
			return this.journalMood === mood;
		},

		moodButtonClass(mood) {
			const parts = ["journal-mood"];
			if (this.isJournalMood(mood)) parts.push("journal-mood--on");
			parts.push(`journal-mood--${mood}`);
			return parts.join(" ");
		},

		scheduleJournalSave() {
			if (this.journalSaveTimer) {
				window.clearTimeout(this.journalSaveTimer);
			}
			this.journalSaveTimer = window.setTimeout(() => {
				this.journalSaveTimer = 0;
				void this.saveJournalNow();
			}, 450);
		},

		async saveJournalNow() {
			const api = window.phantasmal?.journal;
			if (!api) return;
			if (this.journalSaveTimer) {
				window.clearTimeout(this.journalSaveTimer);
				this.journalSaveTimer = 0;
			}

			const composingNew = this.journalComposing && !this.journalEntryId;
			const blank = !this.journalTitle.trim() && !this.journalBody.trim() && !this.journalMood;
			if (composingNew && blank) {
				return;
			}
			if (!this.journalShowEditor && blank) {
				return;
			}

			this.journalSaving = true;
			this.journalError = "";
			try {
				const saved = await api.save({
					day: this.journalDay,
					id: this.journalEntryId || null,
					mood: this.journalMood,
					title: this.journalTitle,
					body: this.journalBody,
				});

				if (saved.isEmpty) {
					this.journalEntryId = "";
					this.journalComposing = false;
					this.journalHabits = [];
				} else {
					this.journalEntryId = saved.id;
					this.journalComposing = false;
					this.journalHabits = saved.habits;
				}

				const snap = await api.get({
					day: this.journalDay,
					entryId: this.journalEntryId || null,
				});
				this.journalDayEntries = snap.dayEntries;
				this.journalRecent = snap.recent;

				if (this.journalOnGraph || this.route === "track") {
					void this.refreshTrack().catch(() => {
						/* Track refresh is best-effort after journal save. */
					});
				}
			} catch (error) {
				this.journalError = error instanceof Error ? error.message : String(error);
			} finally {
				this.journalSaving = false;
			}
		},

		onJournalEditorChange(event) {
			const detail = (event as CustomEvent<{ value: string }>).detail;
			if (!detail || typeof detail.value !== "string") return;
			this.journalBody = detail.value;
			this.scheduleJournalSave();
		},

		onJournalTagQuery(event) {
			const detail = (event as CustomEvent<{ open: boolean; query: string }>).detail;
			if (!detail) return;
			if (detail.open) {
				this.journalTagQuery = detail.query;
				this.journalTagOpen = true;
			} else {
				this.closeJournalTagMenu();
			}
		},

		insertJournalHabitTag(option) {
			this.syncJournalEditorHabits();
			const editor = document.getElementById("journal-md") as DsMarkdownEditor | null;
			editor?.insertHashtag(option.tag);
			this.closeJournalTagMenu();
		},

		syncJournalEditorHabits() {
			const editor = document.getElementById("journal-md") as DsMarkdownEditor | null;
			if (!editor) return;
			editor.habits = this.journalHabitOptions;
		},

		closeJournalTagMenu() {
			this.journalTagOpen = false;
			this.journalTagQuery = "";
		},

		journalHashTag(tag) {
			return `#${tag}`;
		},

		celebrateTodayComplete() {
			if (this.celebrateTimer) {
				window.clearTimeout(this.celebrateTimer);
				this.celebrateTimer = 0;
			}
			this.celebrateMessage = "All habits complete today";
			this.celebrateOpen = true;
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					const toast = document.getElementById("celebrate-toast");
					fireTodayCompleteCelebration(toast);
				});
			});
			this.celebrateTimer = window.setTimeout(() => {
				this.dismissCelebrate();
			}, 3400);
		},

		dismissCelebrate() {
			if (this.celebrateTimer) {
				window.clearTimeout(this.celebrateTimer);
				this.celebrateTimer = 0;
			}
			this.celebrateOpen = false;
			this.celebrateMessage = "";
		},

		async run(action) {
			this.busy = true;
			try {
				this.status = await action();
			} finally {
				this.busy = false;
			}
		},

		async chooseFolder() {
			const api = window.phantasmal?.vault;
			if (!api) return;
			await this.run(() => api.chooseFolder());
			if (this.status?.open) {
				await this.refreshHabits();
			}
		},

		async openExisting() {
			const api = window.phantasmal?.vault;
			if (!api) return;
			await this.run(() => api.openExistingVault());
			if (this.status?.open) {
				await this.refreshHabits();
			}
		},

		async reveal() {
			await window.phantasmal?.vault.revealInFolder();
		},
	};
}
