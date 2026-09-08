export type AppRoute = "home" | "track" | "create" | "break" | "journal" | "identity" | "vault";

export type NavItem = {
	id: AppRoute;
	label: string;
	blurb: string;
	enabled: boolean;
};

/** Sidebar + home overview. Disabled items are stubs until built. */
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
		blurb: "Daily check-ins and streaks—don't break the chain.",
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
		id: "vault",
		label: "Vault",
		blurb: "Where your habit files live on this machine.",
		enabled: true,
	},
];

export function navItemById(id: AppRoute): NavItem | undefined {
	return NAV_ITEMS.find((item) => item.id === id);
}
