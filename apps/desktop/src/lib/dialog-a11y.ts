/** Focus trap + Escape for Alpine dialog panels. */

const FOCUSABLE =
	'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type DialogFocusSession = {
	release: () => void;
};

export type TrapDialogFocusOptions = {
	/** Elements set `inert` while the dialog is open (e.g. app shell). */
	inertRoots?: HTMLElement[];
};

function focusableElements(root: HTMLElement): HTMLElement[] {
	return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
		(el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true",
	);
}

export function trapDialogFocus(
	dialog: HTMLElement,
	options: TrapDialogFocusOptions = {},
): DialogFocusSession {
	const previouslyFocused =
		document.activeElement instanceof HTMLElement ? document.activeElement : null;
	const inertRoots = options.inertRoots?.filter(Boolean) ?? [];

	for (const root of inertRoots) {
		root.inert = true;
	}

	const onKeyDown = (event: KeyboardEvent): void => {
		if (event.key === "Escape") {
			event.preventDefault();
			dialog.dispatchEvent(new CustomEvent("dialog-escape", { bubbles: true }));
			return;
		}

		if (event.key !== "Tab") return;
		const items = focusableElements(dialog);
		if (items.length === 0) {
			event.preventDefault();
			return;
		}

		const first = items[0];
		const last = items[items.length - 1];
		if (!first || !last) return;

		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	};

	dialog.addEventListener("keydown", onKeyDown);

	requestAnimationFrame(() => {
		const items = focusableElements(dialog);
		const preferred =
			dialog.querySelector<HTMLElement>("[data-dialog-initial-focus]") ?? items[0] ?? dialog;
		preferred.focus();
	});

	return {
		release() {
			dialog.removeEventListener("keydown", onKeyDown);
			for (const root of inertRoots) {
				root.inert = false;
			}
			previouslyFocused?.focus();
		},
	};
}
