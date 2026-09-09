export type AppRoute = "track" | "create" | "break" | "journal" | "identity" | "settings";

export type NavItem = {
	id: AppRoute;
	label: string;
	blurb: string;
	enabled: boolean;
};

const APP_ROUTES: readonly AppRoute[] = [
	"track",
	"create",
	"break",
	"journal",
	"identity",
	"settings",
];

export function isAppRoute(id: string): id is AppRoute {
	return (APP_ROUTES as readonly string[]).includes(id);
}

/** Sidebar navigation. Unfinished features open stub screens. */
export const NAV_ITEMS: NavItem[] = [
	{
		id: "track",
		label: "Track",
		blurb: "Daily check-ins and streaks. Keep the chain intact.",
		enabled: true,
	},
	{
		id: "break",
		label: "Break",
		blurb: "Invert the laws to make bad habits invisible, unattractive, hard, and unsatisfying.",
		enabled: true,
	},
	{
		id: "journal",
		label: "Journal",
		blurb: "Reflect on cues, cravings, and identity as the days compound.",
		enabled: true,
	},
	{
		id: "identity",
		label: "Identity",
		blurb: "Who you want to become—the deepest layer of behavior change.",
		enabled: true,
	},
];

export const SETTINGS_NAV: NavItem = {
	id: "settings",
	label: "Settings",
	blurb: "UI, vault, credits, and app updates from GitHub Releases.",
	enabled: true,
};

export function navItemById(id: AppRoute): NavItem | undefined {
	if (id === "settings") return SETTINGS_NAV;
	return NAV_ITEMS.find((item) => item.id === id);
}
