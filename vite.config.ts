import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import electron from "vite-plugin-electron/simple";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const alias = {
	"@": path.resolve(rootDir, "src"),
	"@ds": path.resolve(rootDir, "src/design-system/index.ts"),
	"@components": path.resolve(rootDir, "src/components"),
	"@lib": path.resolve(rootDir, "src/lib"),
};

export default defineConfig({
	resolve: {
		alias,
	},
	plugins: [
		electron({
			main: {
				entry: "electron/main.ts",
			},
			preload: {
				input: "electron/preload.ts",
			},
			renderer: {},
		}),
	],
});
