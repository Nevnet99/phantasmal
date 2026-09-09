#!/usr/bin/env bun
/**
 * Sync GitHub Release installer assets into apps/marketing/public/downloads/
 * with stable filenames and refresh manifest.json for the download page.
 *
 * Usage:
 *   bun scripts/sync-site-downloads.ts --version 0.0.2
 *   bun scripts/sync-site-downloads.ts --version 0.0.2 --repo Nevnet99/phantasmal
 */
import { mkdir, writeFile, access, mkdtemp, rm, copyFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
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
			if (lower.includes("universal")) return 3;
			if (lower.includes("arm64") || lower.includes("aarch")) return 2;
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
	/** Direct download URL from `gh release view` (field is `url`, not browser_download_url). */
	url: string;
	size: number;
};

type GhAssetRaw = {
	name?: string;
	url?: string;
	browserDownloadUrl?: string | null;
	browser_download_url?: string | null;
	size?: number;
};

function normalizeAsset(raw: GhAssetRaw): GhAsset | null {
	const name = raw.name?.trim();
	if (!name) return null;
	const url = (raw.url || raw.browserDownloadUrl || raw.browser_download_url || "").trim();
	if (!url) return null;
	return {
		name,
		url,
		size: typeof raw.size === "number" ? raw.size : 0,
	};
}

async function listAssets(repo: string, tag: string): Promise<GhAsset[]> {
	// `gh` returns camelCase keys; `url` is the download URL (browserDownloadUrl is often null on drafts).
	const out = await $`gh release view ${tag} --repo ${repo} --json assets`.text();
	const parsed = JSON.parse(out) as { assets?: GhAssetRaw[] };
	const assets = (parsed.assets ?? []).map(normalizeAsset).filter((a): a is GhAsset => a !== null);
	return assets;
}

async function downloadAsset(
	repo: string,
	tag: string,
	assetName: string,
	dest: string,
): Promise<void> {
	const tmp = await mkdtemp(path.join(os.tmpdir(), "phantasmal-asset-"));
	try {
		await $`gh release download ${tag} --repo ${repo} --pattern ${assetName} --dir ${tmp} --clobber`;
		const source = path.join(tmp, assetName);
		await access(source);
		await copyFile(source, dest);
	} finally {
		await rm(tmp, { recursive: true, force: true });
	}
}

function publicDownloadUrl(repo: string, tag: string, assetName: string): string {
	return `https://github.com/${repo}/releases/download/${tag}/${encodeURIComponent(assetName)}`;
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
		throw new Error(`No downloadable assets on ${repo} ${tag}`);
	}

	console.log(`Found ${assets.length} assets on ${tag}:`);
	for (const asset of assets) {
		console.log(`  - ${asset.name} (${asset.size} bytes)`);
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

	const missing: PlatformId[] = [];

	for (const pick of PICKS) {
		const candidates = assets.filter((a) => pick.match(a.name));
		if (candidates.length === 0) {
			console.warn(`No asset matched platform ${pick.platform}`);
			missing.push(pick.platform);
			continue;
		}
		candidates.sort((a, b) => pick.priority(b.name) - pick.priority(a.name));
		const chosen = candidates[0]!;
		const dest = path.join(DOWNLOADS, pick.file);
		console.log(`Downloading ${chosen.name} → ${pick.file}`);
		await downloadAsset(repo, tag, chosen.name, dest);

		const meta = LABELS[pick.platform];
		const githubUrl = publicDownloadUrl(repo, tag, chosen.name);
		platforms[pick.platform] = {
			id: pick.platform,
			label: meta.label,
			hint: meta.hint,
			file: pick.file,
			url: `/downloads/${pick.file}`,
			githubUrl,
			size: chosen.size,
		};
	}

	if (missing.length > 0) {
		throw new Error(
			`Missing platforms after sync: ${missing.join(", ")}. ` +
				`Release ${tag} assets were: ${assets.map((a) => a.name).join(", ")}`,
		);
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

	for (const p of Object.values(platforms)) {
		await access(path.join(DOWNLOADS, p.file));
	}

	await writeFile(path.join(DOWNLOADS, ".sync-stamp"), `${manifest.updatedAt}\n${tag}\n`, "utf8");
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
