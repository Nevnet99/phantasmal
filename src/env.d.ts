export {};

import type { BreakApi } from "./shared/break";
import type { HabitsApi } from "./shared/habits";
import type { IdentityApi } from "./shared/identity";
import type { JournalApi } from "./shared/journal";
import type { RemindersApi, SettingsApi } from "./shared/prefs";
import type { VaultApi } from "./shared/vault";

declare global {
	interface Window {
		phantasmal?: {
			platform: NodeJS.Platform;
			vault: VaultApi;
			settings: SettingsApi;
			habits: HabitsApi;
			identity: IdentityApi;
			breaks: BreakApi;
			journal: JournalApi;
			reminders: RemindersApi;
		};
	}
}
