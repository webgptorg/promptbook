import type { HarnessName } from '@/data/harnessCatalog';

/**
 * Props of `<HarnessLogo/>`.
 */
type HarnessLogoProps = {
    /**
     * Which harness logo to render
     */
    readonly harnessName: HarnessName;

    /**
     * Accent color of the logo mark
     */
    readonly accentColor: string;
};

/**
 * Renders a simple inline SVG mark for one harness.
 *
 * Note: These are lightweight original marks evoking each product, not the official vendor
 *       logos, so the page ships without third-party brand assets,
 *       see [`specs/content/harness-catalog.md`](../../../specs/content/harness-catalog.md)
 */
export function HarnessLogo({ harnessName, accentColor }: HarnessLogoProps) {
    return (
        <span
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-700 bg-gray-900"
            aria-hidden
        >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke={accentColor} strokeWidth="2.2">
                {harnessName === 'claude-code' && (
                    // Starburst mark
                    <g strokeLinecap="round">
                        <line x1="14" y1="4" x2="14" y2="24" />
                        <line x1="4" y1="14" x2="24" y2="14" />
                        <line x1="7" y1="7" x2="21" y2="21" />
                        <line x1="21" y1="7" x2="7" y2="21" />
                    </g>
                )}
                {harnessName === 'openai-codex' && (
                    // Hexagonal knot mark
                    <g strokeLinecap="round">
                        <polygon points="14,3 23.5,8.5 23.5,19.5 14,25 4.5,19.5 4.5,8.5" />
                        <circle cx="14" cy="14" r="4" />
                    </g>
                )}
                {harnessName === 'github-copilot' && (
                    // Goggles mark
                    <g strokeLinecap="round">
                        <rect x="3" y="9" width="10" height="9" rx="4" />
                        <rect x="15" y="9" width="10" height="9" rx="4" />
                        <line x1="13" y1="12" x2="15" y2="12" />
                    </g>
                )}
                {harnessName === 'gemini' && (
                    // Four-point spark mark
                    <path
                        d="M14 3 C 15 10, 18 13, 25 14 C 18 15, 15 18, 14 25 C 13 18, 10 15, 3 14 C 10 13, 13 10, 14 3 Z"
                        strokeLinejoin="round"
                    />
                )}
                {harnessName === 'opencode' && (
                    // Terminal prompt mark
                    <g strokeLinecap="round">
                        <polyline points="5,8 12,14 5,20" />
                        <line x1="15" y1="21" x2="23" y2="21" />
                    </g>
                )}
                {harnessName === 'cline' && (
                    // Robot head mark
                    <g strokeLinecap="round">
                        <rect x="5" y="8" width="18" height="14" rx="4" />
                        <line x1="14" y1="4" x2="14" y2="8" />
                        <circle cx="10.5" cy="15" r="1" fill={accentColor} />
                        <circle cx="17.5" cy="15" r="1" fill={accentColor} />
                    </g>
                )}
            </svg>
        </span>
    );
}
