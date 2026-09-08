export {};

declare global {
	interface Window {
		phantasmal?: {
			platform: NodeJS.Platform;
		};
	}
}
