export type UiDensity = "compact" | "comfortable" | "roomy";
export type UiTheme = "system" | "light" | "dark";

export const UI_DENSITIES: UiDensity[] = ["compact", "comfortable", "roomy"];
export const UI_THEMES: UiTheme[] = ["system", "light", "dark"];

export function isUiDensity(value: unknown): value is UiDensity {
	return value === "compact" || value === "comfortable" || value === "roomy";
}

export function isUiTheme(value: unknown): value is UiTheme {
	return value === "system" || value === "light" || value === "dark";
}

export const SETTINGS_CHANNELS = {
	getPrefs: "settings:getPrefs",
	setUiDensity: "settings:setUiDensity",
	setUiTheme: "settings:setUiTheme",
} as const;

export type AppPrefs = {
	uiDensity: UiDensity;
	uiTheme: UiTheme;
};

export type SettingsApi = {
	getPrefs: () => Promise<AppPrefs>;
	setUiDensity: (density: UiDensity) => Promise<AppPrefs>;
	setUiTheme: (theme: UiTheme) => Promise<AppPrefs>;
};
