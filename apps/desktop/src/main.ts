import "@/design-system/styles/global.css";
import "@/styles/app.css";
import "@/design-system";
import Alpine from "@alpinejs/csp";
import { phantasmalApp } from "./app/phantasmal-app";

declare global {
	interface Window {
		Alpine: typeof Alpine;
	}
}

Alpine.data("phantasmalApp", phantasmalApp);
window.Alpine = Alpine;
Alpine.start();
