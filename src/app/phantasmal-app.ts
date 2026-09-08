import type { VaultStatus } from "@/shared/vault";
import type { UiDensity, UiTheme } from "@/shared/prefs";
import { NAV_ITEMS, navItemById, type AppRoute, type NavItem } from "./nav";

export type AppScreen = "loading" | "welcome" | "setup" | "app";
export type SettingsTab = "ui" | "vault";
export type ResolvedTheme = "light" | "dark";

type PhantasmalApp = {
	screen: AppScreen;
	route: AppRoute;
	settingsTab: SettingsTab;
	uiDensity: UiDensity;
	uiTheme: UiTheme;
	systemPrefersDark: boolean;
	status: VaultStatus | null;
	busy: boolean;
	navItems: NavItem[];
	get isLoading(): boolean;
	get isWelcome(): boolean;
	get isSetup(): boolean;
	get isApp(): boolean;
	get isHome(): boolean;
	get isSettings(): boolean;
	get isSettingsUi(): boolean;
	get isSettingsVault(): boolean;
	get isStub(): boolean;
	get isDensityCompact(): boolean;
	get isDensityComfortable(): boolean;
	get isDensityRoomy(): boolean;
	get isThemeSystem(): boolean;
	get isThemeLight(): boolean;
	get isThemeDark(): boolean;
	get resolvedTheme(): ResolvedTheme;
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
	isActive(id: AppRoute): boolean;
	setSettingsTab(tab: SettingsTab): void;
	setDensity(density: UiDensity): Promise<void>;
	setTheme(theme: UiTheme): Promise<void>;
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
	return {
		screen: "loading",
		route: "home",
		settingsTab: "ui",
		uiDensity: "compact",
		uiTheme: "dark",
		systemPrefersDark: true,
		status: null,
		busy: false,
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

		get isSettings() {
			return this.route === "settings";
		},

		get isSettingsUi() {
			return this.settingsTab === "ui";
		},

		get isSettingsVault() {
			return this.settingsTab === "vault";
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

		get resolvedTheme() {
			if (this.uiTheme === "light") return "light";
			if (this.uiTheme === "dark") return "dark";
			return this.systemPrefersDark ? "dark" : "light";
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
			const api = window.phantasmal?.vault;
			const settings = window.phantasmal?.settings;
			if (settings) {
				const prefs = await settings.getPrefs();
				this.uiDensity = prefs.uiDensity;
				this.uiTheme = prefs.uiTheme;
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
				}
			} finally {
				this.busy = false;
			}
		},

		enterApp() {
			if (this.status?.open) {
				this.screen = "app";
				this.route = "home";
			}
		},

		goTo(id) {
			if (!navItemById(id)) return;
			this.route = id;
			if (id === "settings") {
				this.settingsTab = "ui";
			}
		},

		isActive(id) {
			return this.route === id;
		},

		setSettingsTab(tab) {
			this.settingsTab = tab;
		},

		async setDensity(density) {
			this.uiDensity = density;
			const settings = window.phantasmal?.settings;
			if (!settings) return;
			const prefs = await settings.setUiDensity(density);
			this.uiDensity = prefs.uiDensity;
			this.uiTheme = prefs.uiTheme;
		},

		async setTheme(theme) {
			this.uiTheme = theme;
			this.applyTheme();
			const settings = window.phantasmal?.settings;
			if (!settings) return;
			const prefs = await settings.setUiTheme(theme);
			this.uiDensity = prefs.uiDensity;
			this.uiTheme = prefs.uiTheme;
			this.applyTheme();
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
		},

		async openExisting() {
			const api = window.phantasmal?.vault;
			if (!api) return;
			await this.run(() => api.openExistingVault());
		},

		async reveal() {
			await window.phantasmal?.vault.revealInFolder();
		},
	};
}
