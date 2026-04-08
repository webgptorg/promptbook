/**
 * Props for the static office scene surface.
 */
type OfficeSceneSurfaceProps = {
    width: number;
    height: number;
};

/**
 * Renders the static gradients, patterns, and background for the office SVG.
 *
 * @private function of <OfficeScene/>
 */
export function OfficeSceneSurface(props: OfficeSceneSurfaceProps) {
    const { width, height } = props;

    return (
        <>
            <defs>
                <linearGradient id="office-floor-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f8fafc" />
                    <stop offset="42%" stopColor="#e2e8f0" />
                    <stop offset="100%" stopColor="#cbd5e1" />
                </linearGradient>
                <pattern id="office-global-grid-pattern" width="18" height="18" patternUnits="userSpaceOnUse">
                    <path d="M 18 0 L 0 0 0 18" fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="1" />
                    <circle cx="0.9" cy="0.9" r="0.85" fill="rgba(255,255,255,0.66)" />
                </pattern>
                <pattern id="office-room-local-pattern" width="14" height="14" patternUnits="userSpaceOnUse">
                    <rect width="14" height="14" fill="rgba(255,255,255,0.02)" />
                    <path d="M 14 0 L 0 0 0 14" fill="none" stroke="rgba(15,23,42,0.15)" strokeWidth="0.95" />
                    <path d="M 0 7 L 14 7 M 7 0 L 7 14" fill="none" stroke="rgba(255,255,255,0.17)" strokeWidth="0.7" />
                </pattern>
                <pattern id="office-room-remote-pattern" width="14" height="14" patternUnits="userSpaceOnUse">
                    <rect width="14" height="14" fill="rgba(59,130,246,0.03)" />
                    <path d="M 14 0 L 0 0 0 14" fill="none" stroke="rgba(30,64,175,0.2)" strokeWidth="0.95" />
                    <path d="M 0 7 L 14 7 M 7 0 L 7 14" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.7" />
                </pattern>
                <pattern id="office-corridor-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(71,85,105,0.22)" strokeWidth="1" />
                    <path d="M 5 0 L 0 5 M 20 9 L 9 20" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
                </pattern>
                <pattern id="office-desk-wood-pattern" width="12" height="12" patternUnits="userSpaceOnUse">
                    <path d="M 0 3 L 12 3 M 0 9 L 12 9" fill="none" stroke="rgba(15,23,42,0.14)" strokeWidth="1.1" />
                    <path d="M 0 0 L 12 12" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
                </pattern>
            </defs>

            <rect width={width} height={height} fill="url(#office-floor-gradient)" />
            <rect width={width} height={height} fill="url(#office-global-grid-pattern)" opacity={0.45} />
            <ellipse
                cx={width * 0.5}
                cy={height * 0.06}
                rx={width * 0.55}
                ry={height * 0.34}
                fill="rgba(56,189,248,0.14)"
            />
        </>
    );
}
