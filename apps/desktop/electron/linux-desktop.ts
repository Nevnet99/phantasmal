import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** FreeDesktop desktop file id — must match electron-builder `desktopName`. */
export const LINUX_DESKTOP_ID = "com.nevnet99.phantasmal";

/**
 * AppImage mounts under a new /tmp/.mount_* path every launch. Pinning that
 * temporary .desktop breaks after quit. Install a stable user launcher that
 * Exec= the real AppImage path (process.env.APPIMAGE).
 */
export function installAppImageDesktopEntry(): { desktopPath: string } | null {
	if (process.platform !== "linux") return null;

	const appImagePath = process.env.APPIMAGE;
	if (!appImagePath || !fs.existsSync(appImagePath)) return null;

	// Browser downloads often land without +x; the pin then fails with a
	// "missing executable permissions" dialog even when the file exists.
	try {
		fs.chmodSync(appImagePath, 0o755);
	} catch (err) {
		console.error("Failed to chmod AppImage:", err);
	}

	const home = os.homedir();
	const applicationsDir = path.join(home, ".local", "share", "applications");
	const iconsDir = path.join(home, ".local", "share", "icons", "hicolor", "512x512", "apps");
	const desktopPath = path.join(applicationsDir, `${LINUX_DESKTOP_ID}.desktop`);
	const iconDest = path.join(iconsDir, `${LINUX_DESKTOP_ID}.png`);

	fs.mkdirSync(applicationsDir, { recursive: true });
	fs.mkdirSync(iconsDir, { recursive: true });

	const iconSrc = resolveAppImageIcon();
	if (iconSrc) {
		try {
			fs.copyFileSync(iconSrc, iconDest);
		} catch {
			// Icon is nice-to-have; launcher still works without it.
		}
	}

	// Absolute Icon= path — theme names often fail on Plasma after quit
	// (pinned tile becomes a blank/generic file icon).
	const iconValue = fs.existsSync(iconDest) ? iconDest : "Phantasmal";
	const exec = quoteDesktopExec(appImagePath);
	const body = [
		"[Desktop Entry]",
		"Type=Application",
		"Name=Phantasmal",
		"Comment=Local-first habit workspace for tracking, creating, and breaking habits",
		`Exec=${exec} --no-sandbox %U`,
		"Terminal=false",
		`Icon=${iconValue}`,
		`StartupWMClass=${LINUX_DESKTOP_ID}`,
		"Categories=Office;",
		"X-AppImage-Integrate=true",
		"",
	].join("\n");

	try {
		const previous = fs.existsSync(desktopPath) ? fs.readFileSync(desktopPath, "utf8") : "";
		if (previous !== body) {
			fs.writeFileSync(desktopPath, body, "utf8");
			fs.chmodSync(desktopPath, 0o755);
		}
	} catch (err) {
		console.error("Failed to install AppImage desktop entry:", err);
		return null;
	}

	refreshIconCache(path.join(home, ".local", "share", "icons", "hicolor"));

	return { desktopPath };
}

function refreshIconCache(hicolorDir: string): void {
	try {
		execFileSync("gtk-update-icon-cache", ["-f", "-t", hicolorDir], {
			stdio: "ignore",
			timeout: 5_000,
		});
	} catch {
		// Optional; absolute Icon= still works without a rebuilt cache.
	}
}

function resolveAppImageIcon(): string | undefined {
	const appDir = process.env.APPDIR;
	const candidates = [
		appDir ? path.join(appDir, "usr/share/icons/hicolor/512x512/apps/Phantasmal.png") : null,
		appDir ? path.join(appDir, "Phantasmal.png") : null,
	];
	return candidates.find((candidate): candidate is string =>
		Boolean(candidate && fs.existsSync(candidate)),
	);
}

/** Quote a path for a Desktop Entry Exec= key (spaces / special chars). */
export function quoteDesktopExec(filePath: string): string {
	if (!/[^\w@%/+.,:=-]/i.test(filePath)) {
		return filePath;
	}
	return `"${filePath.replace(/(["`$\\])/g, "\\$1")}"`;
}
