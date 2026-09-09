/** About payload for Settings → About. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	APP_ATOMIC_HABITS_URL,
	APP_ISSUES_URL,
	APP_RELEASES_URL,
	APP_REPO_URL,
	type AppAbout,
} from "../src/shared/app";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function readAppVersion(): string {
	const candidates = [
		path.join(__dirname, "../package.json"),
		path.join(__dirname, "../../package.json"),
	];
	for (const filePath of candidates) {
		try {
			const raw = fs.readFileSync(filePath, "utf8");
			const parsed = JSON.parse(raw) as { version?: unknown };
			if (typeof parsed.version === "string" && parsed.version) return parsed.version;
		} catch {
			/* try next */
		}
	}
	return "0.0.0";
}

export function buildAppAbout(version = readAppVersion()): AppAbout {
	return {
		name: "Phantasmal",
		version,
		description: "Local-first Atomic Habits workspace for tracking, creating, and breaking habits.",
		links: [
			{
				id: "repo",
				label: "GitHub repository",
				href: APP_REPO_URL,
				blurb: "Source code, issues, and pull requests.",
			},
			{
				id: "releases",
				label: "Downloads & releases",
				href: APP_RELEASES_URL,
				blurb: "Packaged builds for Linux, macOS, and Windows.",
			},
			{
				id: "issues",
				label: "Report an issue",
				href: APP_ISSUES_URL,
				blurb: "Bugs and ideas welcome.",
			},
			{
				id: "atomic-habits",
				label: "Atomic Habits",
				href: APP_ATOMIC_HABITS_URL,
				blurb: "James Clear’s book that inspired this workspace.",
			},
		],
		credits: [
			{
				id: "atomic-habits",
				label: "Atomic Habits — James Clear",
				blurb: "Core ideas: identity, four laws, and habit stacking.",
			},
			{
				id: "electron",
				label: "Electron",
				blurb: "Desktop shell and native folder dialogs.",
			},
			{
				id: "vite",
				label: "Vite",
				blurb: "Dev server and production bundling.",
			},
			{
				id: "lit",
				label: "Lit",
				blurb: "Design-system web components (ds-*).",
			},
			{
				id: "alpine",
				label: "Alpine.js",
				blurb: "App screens and thin UI logic.",
			},
			{
				id: "tiptap",
				label: "TipTap",
				blurb: "Live markdown journal editor.",
			},
			{
				id: "geist",
				label: "Geist Variable & Geist Mono",
				blurb: "UI and path typography (self-hosted).",
			},
			{
				id: "material-symbols",
				label: "Material Symbols Outlined",
				blurb: "Icon font (self-hosted).",
			},
		],
	};
}
