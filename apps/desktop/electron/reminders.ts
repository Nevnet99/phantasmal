import { Notification, app } from "electron";
import { readConfig, setLastReminderDay } from "./config";

/** Update dock/taskbar badge and optionally fire a once-per-day due reminder. */
export function syncDueTodayReminder(userDataDir: string, remaining: number, today: string): void {
	const count = Math.max(0, Math.floor(remaining));
	if (typeof app.setBadgeCount === "function") {
		app.setBadgeCount(count);
	}
	if (process.platform === "darwin" && app.dock) {
		app.dock.setBadge(count > 0 ? String(count) : "");
	}

	const config = readConfig(userDataDir);
	if (!config.dailyReminder || count <= 0 || config.lastReminderDay === today) {
		return;
	}

	if (Notification.isSupported()) {
		const title = count === 1 ? "1 habit left today" : `${count} habits left today`;
		new Notification({
			title,
			body: "Open Phantasmal to keep the chain intact.",
		}).show();
	}

	setLastReminderDay(userDataDir, today);
}
