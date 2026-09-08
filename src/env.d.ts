export {};

import type { SettingsApi } from "./shared/prefs";
import type { VaultApi } from "./shared/vault";

declare global {
	interface Window {
		phantasmal?: {
			platform: NodeJS.Platform;
			vault: VaultApi;
			settings: SettingsApi;
		};
	}
}
