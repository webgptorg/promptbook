/**
 * Design-system tokens for the onboarding wizard, expressed as reusable Tailwind class
 * strings backed by the CSS variables in `globals.css`. The `[data-onboarding-ui]` token scope is set on the
 * `WizardShell` root (present in SSR markup, inherits to every step) — every primitive in
 * this module renders inside the shell, so no client-side <html> stamping is needed (and
 * stamping <html> on the client would cause a server/client hydration mismatch).
 *
 * Centralising these strings keeps the accent hue, focus ring, radii and shadows
 * consistent across every component (DRY) — change a token here and the whole module
 * follows.
 */

/** Accent-tinted focus ring shared by every interactive control. */
export const FOCUS_RING =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ob-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-white';

/** Same ring, for controls that use `:focus` (inputs) rather than `:focus-visible`. */
export const FOCUS_RING_INPUT =
    'focus:outline-none focus:border-[color:var(--ob-accent-400)] focus:ring-4 focus:ring-[color:var(--ob-accent-500)]/15';

/** Soft layered shadows. */
export const SHADOW = {
    sm: 'shadow-[var(--ob-shadow-sm)]',
    md: 'shadow-[var(--ob-shadow-md)]',
    lg: 'shadow-[var(--ob-shadow-lg)]',
    accent: 'shadow-[var(--ob-shadow-accent)]',
} as const;

/** Accent surface utilities — kept as bracketed CSS-var classes so the palette is single-sourced. */
export const ACCENT = {
    text: 'text-[color:var(--ob-accent-600)]',
    bg: 'bg-[color:var(--ob-accent-600)]',
    bgHover: 'hover:bg-[color:var(--ob-accent-700)]',
    bgActive: 'active:bg-[color:var(--ob-accent-800)]',
    border: 'border-[color:var(--ob-accent-200)]',
    softBg: 'bg-[color:var(--ob-accent-50)]',
} as const;
