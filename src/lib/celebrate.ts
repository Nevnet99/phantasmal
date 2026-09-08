import confetti from "canvas-confetti";

function readColor(name: string, fallback: string): string {
	const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	return value || fallback;
}

function celebrationColors(): string[] {
	return [
		readColor("--color-accent", "#8fbc8f"),
		readColor("--color-ink", "#e8efe6"),
		readColor("--color-muted", "#9aab9e"),
		readColor("--color-danger", "#e8a090"),
	];
}

function prefersReducedMotion(): boolean {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function originFromElement(el: HTMLElement): { x: number; y: number } {
	const rect = el.getBoundingClientRect();
	const viewW = Math.max(window.innerWidth, 1);
	const viewH = Math.max(window.innerHeight, 1);
	return {
		x: (rect.left + rect.width / 2) / viewW,
		y: (rect.top + rect.height * 0.35) / viewH,
	};
}

function edgeOrigins(el: HTMLElement): [{ x: number; y: number }, { x: number; y: number }] {
	const rect = el.getBoundingClientRect();
	const viewW = Math.max(window.innerWidth, 1);
	const viewH = Math.max(window.innerHeight, 1);
	const y = (rect.top + rect.height * 0.4) / viewH;
	return [
		{ x: (rect.left + rect.width * 0.12) / viewW, y },
		{ x: (rect.left + rect.width * 0.88) / viewW, y },
	];
}

/** Confetti burst anchored to the celebrate toast. Skips when reduced-motion is on. */
export function fireTodayCompleteCelebration(anchor: HTMLElement | null): void {
	if (prefersReducedMotion() || !anchor) return;

	const colors = celebrationColors();
	const defaults = {
		colors,
		disableForReducedMotion: true,
		zIndex: 80,
	};
	const origin = originFromElement(anchor);
	const [left, right] = edgeOrigins(anchor);

	void confetti({
		...defaults,
		particleCount: 48,
		spread: 62,
		startVelocity: 28,
		gravity: 1.05,
		ticks: 160,
		origin,
		scalar: 0.82,
	});

	window.setTimeout(() => {
		void confetti({
			...defaults,
			particleCount: 28,
			angle: 70,
			spread: 42,
			startVelocity: 24,
			ticks: 150,
			origin: left,
			scalar: 0.78,
		});
		void confetti({
			...defaults,
			particleCount: 28,
			angle: 110,
			spread: 42,
			startVelocity: 24,
			ticks: 150,
			origin: right,
			scalar: 0.78,
		});
	}, 90);
}
