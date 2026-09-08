import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(rootDir, "src"),
			"@ds": path.resolve(rootDir, "src/design-system/index.ts"),
			"@components": path.resolve(rootDir, "src/components"),
			"@lib": path.resolve(rootDir, "src/lib"),
		},
	},
	test: {
		environment: "node",
		include: ["src/**/*.{test,spec}.{ts,js}"],
	},
});
