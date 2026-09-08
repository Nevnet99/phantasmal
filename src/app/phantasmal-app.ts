import type {
	CalendarCell,
	GraphCell,
	HabitSchedule,
	HabitView,
	TrackSnapshot,
	Weekday,
} from "@/shared/habits";
import { WEEKDAY_LABELS } from "@/shared/habits";
import type { VaultStatus } from "@/shared/vault";
import type { AppPrefs, UiDensity, UiTheme } from "@/shared/prefs";
import { formatDayLabel, localDayKey, parseDayKey } from "@/lib/day";
import { fireTodayCompleteCelebration } from "@/lib/celebrate";
import { trapDialogFocus, type DialogFocusSession } from "@/lib/dialog-a11y";
import { NAV_ITEMS, isAppRoute, navItemById, type AppRoute, type NavItem } from "./nav";

export type AppScreen = "loading" | "welcome" | "setup" | "app";
export type SettingsTab = "ui" | "vault" | "habits";
export type ResolvedTheme = "light" | "dark";
export type ScheduleKind = "daily" | "weekly" | "every_n_days";
export type TrackVizMode = "graph" | "calendar";

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
		remainingCount: 0,
		doneCount: 0,
		totalCount: 0,
		habits: [],
		remaining: [],
		graph: [],
		weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
		calendarMonthLabel: "",
		calendarYear: year,
		calendarMonth: month,
		calendarCells: [],
	};
}

type PhantasmalApp = {
	screen: AppScreen;
	route: AppRoute;
	settingsTab: SettingsTab;
	uiDensity: UiDensity;
	uiTheme: UiTheme;
	dailyReminder: boolean;
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
	removeDialogId: string;
	removeDialogName: string;
	removeArchiveNote: string;
	removeBusy: boolean;
	removeDialogFocus: DialogFocusSession | null;
	createName: string;
	createCue: string;
	createNote: string;
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
	navItems: NavItem[];
	get isLoading(): boolean;
	get isWelcome(): boolean;
	get isSetup(): boolean;
	get isApp(): boolean;
	get isHome(): boolean;
	get isTrack(): boolean;
	get isCreate(): boolean;
	get isSettings(): boolean;
	get isSettingsUi(): boolean;
	get isSettingsVault(): boolean;
	get isSettingsHabits(): boolean;
	get hasArchivedHabits(): boolean;
	get isStub(): boolean;
	get isDensityCompact(): boolean;
	get isDensityComfortable(): boolean;
	get isDensityRoomy(): boolean;
	get isThemeSystem(): boolean;
	get isThemeLight(): boolean;
	get isThemeDark(): boolean;
	get isDailyReminderOn(): boolean;
	get isDailyReminderOff(): boolean;
	get resolvedTheme(): ResolvedTheme;
	get hasStackOptions(): boolean;
	get stackOptions(): { id: string; name: string }[];
	get trackEmpty(): boolean;
	get nothingDue(): boolean;
	get hasRemaining(): boolean;
	get isEditing(): boolean;
	get isScheduleDaily(): boolean;
	get isScheduleWeekly(): boolean;
	get isScheduleEveryNDays(): boolean;
	get isTrackGraph(): boolean;
	get isTrackCalendar(): boolean;
	get dayPopStyle(): string;
	get dayPopSummary(): string;
	get dayPopHasDone(): boolean;
	get dayPopHasMissed(): boolean;
	get dayPopBelow(): boolean;
	get dayPopReady(): boolean;
	get formTitle(): string;
	get formSubmitLabel(): string;
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
	syncReminders(): void;
	refreshHabits(): Promise<void>;
	refreshArchivedHabits(): Promise<void>;
	refreshTrack(): Promise<void>;
	restoreArchivedHabit(id: string): Promise<void>;
	selectDay(day: string): void;
	shiftMonth(delta: number): void;
	goToToday(): void;
	setTrackViz(mode: TrackVizMode): void;
	onTrackVizChange(event: Event): void;
	showDayPop(event: Event, cell: GraphCell | CalendarCell): void;
	placeDayPop(): void;
	hideDayPop(): void;
	graphLevelClass(cell: GraphCell): string;
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
	saveHabitForm(): Promise<void>;
	createHabit(): Promise<void>;
	toggleHabit(id: string): Promise<void>;
	openRemoveDialog(habit: HabitView): void;
	closeRemoveDialog(): void;
	confirmArchiveHabit(): Promise<void>;
	confirmDeleteHabit(): Promise<void>;
	celebrateTodayComplete(): void;
	dismissCelebrate(): void;
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
		route: "home",
		settingsTab: "ui",
		uiDensity: "compact",
		uiTheme: "dark",
		dailyReminder: true,
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
		removeDialogId: "",
		removeDialogName: "",
		removeArchiveNote: "",
		removeBusy: false,
		removeDialogFocus: null,
		createName: "",
		createCue: "",
		createNote: "",
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

		get isHome() {
			return this.route === "home";
		},

		get isTrack() {
			return this.route === "track";
		},

		get isCreate() {
			return this.route === "create";
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
			return !this.habitsBusy && this.habits.length === 0;
		},

		get nothingDue() {
			return !this.habitsBusy && this.habits.length > 0 && this.track.totalCount === 0;
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
			this.route = "home";
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
					this.route = "home";
					await this.refreshHabits();
				}
			} finally {
				this.busy = false;
			}
		},

		enterApp() {
			if (this.status?.open) {
				this.screen = "app";
				this.route = "home";
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
			}
		},

		applyPrefs(prefs) {
			this.uiDensity = prefs.uiDensity;
			this.uiTheme = prefs.uiTheme;
			this.dailyReminder = prefs.dailyReminder;
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

		async refreshTrack() {
			const api = window.phantasmal?.habits;
			if (!api) return;
			const snap = await api.getTrack({
				selectedDay: this.selectedDay,
				month: this.calendarMonth,
				year: this.calendarYear,
			});
			this.track = snap;
			this.habits = snap.habits;
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

		goToToday() {
			this.selectedDay = localDayKey();
			const parts = parseDayKey(this.selectedDay);
			this.calendarYear = parts.year;
			this.calendarMonth = parts.month;
			void this.refreshTrack().catch((error) => {
				this.habitsError = error instanceof Error ? error.message : String(error);
			});
		},

		setTrackViz(mode) {
			this.trackViz = mode;
		},

		onTrackVizChange(event) {
			const detail = (event as CustomEvent<{ value: TrackVizMode }>).detail;
			if (detail?.value === "graph" || detail?.value === "calendar") {
				this.setTrackViz(detail.value);
			}
		},

		showDayPop(event, cell) {
			if ("empty" in cell && cell.empty) return;
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

		graphLevelClass(cell) {
			return `graph__cell graph__cell--l${cell.level}`;
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
			this.stackAfterId = habit.stackAfterId ?? "";
			this.createError = "";
			this.loadScheduleForm(habit.schedule);
			this.route = "create";
		},

		cancelEdit() {
			this.editingId = null;
			this.createName = "";
			this.createCue = "";
			this.createNote = "";
			this.stackAfterId = "";
			this.createError = "";
			this.resetScheduleForm();
		},

		async saveHabitForm() {
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
						schedule: this.buildSchedule(),
						stackAfterId: this.stackAfterId || null,
					},
					this.selectedDay,
				);
				this.createName = "";
				this.createCue = "";
				this.createNote = "";
				this.stackAfterId = "";
				this.editingId = null;
				this.resetScheduleForm();
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

		openRemoveDialog(habit) {
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

		closeRemoveDialog() {
			this.removeDialogFocus?.release();
			this.removeDialogFocus = null;
			this.removeDialogOpen = false;
			this.removeDialogId = "";
			this.removeDialogName = "";
			this.removeArchiveNote = "";
			this.removeBusy = false;
		},

		async confirmArchiveHabit() {
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

		async confirmDeleteHabit() {
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
