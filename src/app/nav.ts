export type AppRoute = "home" | "track" | "create" | "break" | "journal" | "identity" | "settings";

export type NavItem = {
	id: AppRoute;
	label: string;
	blurb: string;
	enabled: boolean;
};

/** Sidebar + home overview. Unfinished features open stub screens. */
export const NAV_ITEMS: NavItem[] = [
	{
		id: "home",
		label: "Home",
		blurb: "Overview of your systems and quick links into each area.",
		enabled: true,
	},
	{
		id: "track",
		label: "Track",
		blurb: "Daily check-ins and streaks. Keep the chain intact.",
		enabled: false,
	},
	{
		id: "create",
		label: "Create",
		blurb: "Design good habits with the Four Laws, stacking, and the 2-minute rule.",
		enabled: false,
	},
	{
		id: "break",
		label: "Break",
		blurb: "Invert the laws to make bad habits invisible, unattractive, hard, and unsatisfying.",
		enabled: false,
	},
	{
		id: "journal",
		label: "Journal",
		blurb: "Reflect on cues, cravings, and identity as the days compound.",
		enabled: false,
	},
	{
		id: "identity",
		label: "Identity",
		blurb: "Who you want to become—the deepest layer of behavior change.",
		enabled: false,
	},
	{
		id: "settings",
		label: "Settings",
		blurb: "Density, vault location, and machine preferences.",
		enabled: true,
	},
];

export function navItemById(id: AppRoute): NavItem | undefined {
	return NAV_ITEMS.find((item) => item.id === id);
}
