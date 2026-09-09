/** About, credits, links, and packaged app updates. */

export const APP_CHANNELS = {
	getAbout: "app:getAbout",
	openExternal: "app:openExternal",
	getUpdateStatus: "app:getUpdateStatus",
	checkForUpdates: "app:checkForUpdates",
	downloadUpdate: "app:downloadUpdate",
	installUpdate: "app:installUpdate",
	updateStatusEvent: "app:updateStatus",
} as const;

export const APP_REPO_URL = "https://github.com/Nevnet99/phantasmal";
export const APP_ISSUES_URL = "https://github.com/Nevnet99/phantasmal/issues";
export const APP_RELEASES_URL = "https://github.com/Nevnet99/phantasmal/releases";
export const APP_ATOMIC_HABITS_URL = "https://jamesclear.com/atomic-habits";

export type AppLink = {
	id: string;
	label: string;
	href: string;
	blurb: string;
};

export type AppCredit = {
	id: string;
	label: string;
	blurb: string;
};

export type AppAbout = {
	name: string;
	version: string;
	description: string;
	links: AppLink[];
	credits: AppCredit[];
};

export type AppUpdateState =
	"idle" | "checking" | "available" | "not-available" | "downloading" | "downloaded" | "error";

export type AppUpdateStatus = {
	/** False in `bun run dev`; auto-update only works in packaged builds. */
	packaged: boolean;
	currentVersion: string;
	state: AppUpdateState;
	availableVersion: string;
	/** Download progress 0–100 while downloading. */
	progress: number;
	summary: string;
	error: string;
};

export type AppApi = {
	getAbout: () => Promise<AppAbout>;
	openExternal: (url: string) => Promise<void>;
	getUpdateStatus: () => Promise<AppUpdateStatus>;
	checkForUpdates: () => Promise<AppUpdateStatus>;
	downloadUpdate: () => Promise<AppUpdateStatus>;
	installUpdate: () => Promise<void>;
	onUpdateStatus: (listener: (status: AppUpdateStatus) => void) => () => void;
};

export function isAllowedExternalUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return parsed.protocol === "https:" || parsed.protocol === "http:";
	} catch {
		return false;
	}
}
