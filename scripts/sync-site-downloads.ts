#!/usr/bin/env bun
/**
 * Sync GitHub Release installer assets into apps/marketing/public/downloads/
 * with stable filenames and refresh manifest.json for the download page.
 *
 * Usage:
 *   bun scripts/sync-site-downloads.ts --version 0.0.2
 *   bun scripts/sync-site-downloads.ts --version 0.0.2 --repo Nevnet99/phantasmal
 */
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { $ } from "bun";

const ROOT = path.resolve(import.meta.dir, "..");
const DOWNLOADS = path.join(ROOT, "apps/marketing/public/downloads");
const MANIFEST_PATH = path.join(DOWNLOADS, "manifest.json");

type PlatformId = "linux" | "mac" | "windows";

type AssetPick = {
	platform: PlatformId;
	file: string;
	match: (name: string) => boolean;
	priority: (name: string) => number;
};

const PICKS: AssetPick[] = [
	{
		platform: "linux",
		file: "phantasmal-linux.AppImage",
		match: (n) => n.toLowerCase().endsWith(".appimage"),
		priority: (n) => (n.toLowerCase().includes("arm") ? 0 : 1),
	},
	{
		platform: "mac",
		file: "phantasmal-mac.dmg",
		match: (n) => n.toLowerCase().endsWith(".dmg"),
		priority: (n) => {
			const lower = n.toLowerCase();
			if (lower.includes("arm64") || lower.includes("aarch")) return 2;
			if (lower.includes("universal")) return 3;
			return 1;
		},
	},
	{
		platform: "windows",
		file: "phantasmal-windows.exe",
		match: (n) => n.toLowerCase().endsWith(".exe") && !n.toLowerCase().includes("uninstall"),
		priority: (n) =>
			n.toLowerCase().includes("setup") || n.toLowerCase().includes("installer") ? 2 : 1,
	},
];

const LABELS: Record<PlatformId, { label: string; hint: string }> = {
	linux: { label: "Linux", hint: "AppImage" },
	mac: { label: "macOS", hint: "DMG" },
	windows: { label: "Windows", hint: "Installer" },
};

function argValue(flag: string): string | undefined {
	const idx = process.argv.indexOf(flag);
	if (idx === -1) return undefined;
	return process.argv[idx + 1];
}

function normalizeVersion(raw: string): { version: string; tag: string } {
	const version = raw.replace(/^v/, "");
	return { version, tag: `v${version}` };
}

type GhAsset = {
	name: string;
	browser_download_url: string;
	size: number;
};

async function listAssets(repo: string, tag: string): Promise<GhAsset[]> {
	const out = await $`gh release view ${tag} --repo ${repo} --json assets --jq '.assets'`.text();
	return JSON.parse(out) as GhAsset[];
}

async function downloadAsset(url: string, dest: string): Promise<void> {
	const res = await fetch(url, {
		headers: {
			Accept: "application/octet-stream",
			Authorization: process.env.GH_TOKEN ? `Bearer ${process.env.GH_TOKEN}` : "",
			"User-Agent": "phantasmal-sync-site-downloads",
		},
		redirect: "follow",
	});
	if (!res.ok) {
		throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
	}
	await Bun.write(dest, res);
}

async function main() {
	const versionArg = argValue("--version");
	if (!versionArg) {
		console.error("Missing --version (e.g. 0.0.2)");
		process.exit(1);
	}
	const repo = argValue("--repo") ?? "Nevnet99/phantasmal";
	const { version, tag } = normalizeVersion(versionArg);

	await mkdir(DOWNLOADS, { recursive: true });

	const assets = await listAssets(repo, tag);
	if (assets.length === 0) {
		throw new Error(`No assets on ${repo} ${tag}`);
	}

	const platforms: Record<
		string,
		{
			id: PlatformId;
			label: string;
			hint: string;
			file: string;
			url: string;
			githubUrl: string;
			size: number;
		}
	> = {};

	for (const pick of PICKS) {
		const candidates = assets.filter((a) => pick.match(a.name));
		if (candidates.length === 0) {
			console.warn(`No asset matched platform ${pick.platform}`);
			continue;
		}
		candidates.sort((a, b) => pick.priority(b.name) - pick.priority(a.name));
		const chosen = candidates[0]!;
		const dest = path.join(DOWNLOADS, pick.file);
		console.log(`Downloading ${chosen.name} → ${pick.file}`);
		await downloadAsset(chosen.browser_download_url, dest);

		const meta = LABELS[pick.platform];
		platforms[pick.platform] = {
			id: pick.platform,
			label: meta.label,
			hint: meta.hint,
			file: pick.file,
			url: `/downloads/${pick.file}`,
			githubUrl: chosen.browser_download_url,
			size: chosen.size,
		};
	}

	const missing = PICKS.filter((p) => !platforms[p.platform]).map((p) => p.platform);
	if (missing.length > 0) {
		throw new Error(`Missing platforms after sync: ${missing.join(", ")}`);
	}

	const manifest = {
		version,
		tag,
		updatedAt: new Date().toISOString(),
		platforms,
		fallback: {
			url: `https://github.com/${repo}/releases/tag/${tag}`,
			label: `Release ${tag} on GitHub`,
		},
	};

	await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, "\t")}\n`, "utf8");
	console.log(`Wrote ${MANIFEST_PATH}`);

	// Ensure LFS-friendly copies exist (sanity)
	for (const p of Object.values(platforms)) {
		await access(path.join(DOWNLOADS, p.file));
	}

	// Touch a tiny marker so PR always has a text change if binaries are identical
	await writeFile(path.join(DOWNLOADS, ".sync-stamp"), `${manifest.updatedAt}\n${tag}\n`, "utf8");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
