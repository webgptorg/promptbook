import type { CoreBenefitIllustration } from '@/data/coreBenefits';
import { useId, type ReactNode } from 'react';

/**
 * Props of `<CoreBenefitGraphic/>`.
 */
type CoreBenefitGraphicProps = {
    /**
     * Illustration selected by the core benefit definition.
     */
    readonly illustration: CoreBenefitIllustration;
};

/**
 * Instance-specific SVG paints shared by the three illustration scenes.
 */
type GraphicPaints = {
    readonly surface: string;
    readonly edge: string;
    readonly connection: string;
    readonly shadow: string;
};

/**
 * A small terminal window used within a benefit illustration.
 */
type GraphicWindowProps = {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly title: string;
    readonly paints: GraphicPaints;
    readonly children: ReactNode;
};

/**
 * Interchangeable destinations around the portable agent file.
 */
const PORTABLE_HARNESSES = [
    { label: 'Claude Code', x: 12, y: 20, width: 122, color: '#EBA58B' },
    { label: 'Codex', x: 206, y: 26, width: 102, color: '#E2E8F0' },
    { label: 'Local models', x: 12, y: 180, width: 130, color: '#7AFFEB' },
    { label: 'opencode', x: 190, y: 180, width: 118, color: '#7AEBFF' },
] as const;

/**
 * Line positions and lengths in the illustrative code diff.
 */
const CODE_DIFF_LINES = [
    { y: 60, endX: 99 },
    { y: 77, endX: 79 },
    { y: 94, endX: 107 },
] as const;

/**
 * Renders a scalable, decorative product scene for one core `ptbk coder` benefit.
 */
export function CoreBenefitGraphic({ illustration }: CoreBenefitGraphicProps) {
    // Each instance owns its paint IDs, including when the same benefit is rendered twice.
    const GRAPHIC_ID = useId();
    const PAINTS: GraphicPaints = {
        surface: `url(#${GRAPHIC_ID}-surface)`,
        edge: `url(#${GRAPHIC_ID}-edge)`,
        connection: `url(#${GRAPHIC_ID}-connection)`,
        shadow: `url(#${GRAPHIC_ID}-shadow)`,
    };

    return (
        <div
            className="relative isolate mx-auto w-full max-w-sm overflow-hidden rounded-xl border border-promptbook-blue/10 bg-[#0B1220]"
            aria-hidden="true"
        >
            <svg className="block h-auto w-full" viewBox="0 0 320 232" fill="none" focusable="false">
                <GraphicDefinitions id={GRAPHIC_ID} />
                <rect width="320" height="232" fill={`url(#${GRAPHIC_ID}-glow)`} />
                <rect width="320" height="232" fill={`url(#${GRAPHIC_ID}-grid)`} />
                <path d="M24 1H296" stroke={PAINTS.edge} />
                {illustration === 'autopilot' && <AutopilotGraphic paints={PAINTS} />}
                {illustration === 'portable-agent' && <PortableAgentGraphic paints={PAINTS} />}
                {illustration === 'git-synced-prd' && <GitSyncedPrdGraphic paints={PAINTS} />}
            </svg>
        </div>
    );
}

/**
 * Defines the shared lighting, surface materials, and fine background grid.
 */
function GraphicDefinitions({ id }: { readonly id: string }) {
    return (
        <defs>
            <linearGradient id={`${id}-surface`} x1="0" y1="0" x2="0.8" y2="1">
                <stop stopColor="#1C3041" />
                <stop offset="0.5" stopColor="#122130" />
                <stop offset="1" stopColor="#0F1B29" />
            </linearGradient>
            <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#7AEBFF" stopOpacity="0.55" />
                <stop offset="0.5" stopColor="#7AEBFF" stopOpacity="0.12" />
                <stop offset="1" stopColor="#7AFFEB" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id={`${id}-connection`} x1="0" y1="0" x2="0" y2="1">
                <stop stopColor="#7AEBFF" stopOpacity="0.4" />
                <stop offset="1" stopColor="#7AFFEB" />
            </linearGradient>
            <radialGradient id={`${id}-glow`} cx="50%" cy="48%" r="65%">
                <stop stopColor="#30A8BD" stopOpacity="0.2" />
                <stop offset="1" stopColor="#0B1220" stopOpacity="0" />
            </radialGradient>
            <pattern id={`${id}-grid`} width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="8" cy="8" r="0.6" fill="#7AEBFF" opacity="0.12" />
            </pattern>
            <filter id={`${id}-shadow`} x="-30%" y="-40%" width="160%" height="200%">
                <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#020617" floodOpacity="0.5" />
            </filter>
        </defs>
    );
}

/**
 * Draws consistent window chrome while keeping the scene content independent.
 */
function GraphicWindow({ x, y, width, height, title, paints, children }: GraphicWindowProps) {
    return (
        <g transform={`translate(${x} ${y})`}>
            <rect
                width={width}
                height={height}
                rx="12"
                fill={paints.surface}
                stroke={paints.edge}
                filter={paints.shadow}
            />
            <path d={`M0 29H${width}`} stroke="#7AEBFF" strokeOpacity="0.1" />
            <circle cx="13" cy="15" r="2.5" fill="#7AEBFF" fillOpacity="0.8" />
            <circle cx="22" cy="15" r="2.5" fill="#7AEBFF" fillOpacity="0.25" />
            <text x="34" y="19" fill="#C3D4E3" fontSize="11" className="font-mono">
                {title}
            </text>
            {children}
        </g>
    );
}

/**
 * Draws a reusable completion mark at the given scene coordinates.
 */
function GraphicCheck({ x, y }: { readonly x: number; readonly y: number }) {
    return (
        <g transform={`translate(${x} ${y})`}>
            <rect width="15" height="15" rx="4" fill="#7AFFEB" fillOpacity="0.12" />
            <path
                d="M4 7.5L6.5 10L11 5"
                stroke="#7AFFEB"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </g>
    );
}

/**
 * Draws a running prompt queue with a floating tested-and-committed receipt.
 */
function AutopilotGraphic({ paints }: { readonly paints: GraphicPaints }) {
    return (
        <g>
            <rect x="38" y="18" width="244" height="166" rx="12" fill="#132737" stroke={paints.edge} opacity="0.5" />
            <GraphicWindow x={20} y={30} width={280} height={164} title="prompts/" paints={paints}>
                <circle cx="215" cy="15" r="3" fill="#7AFFEB" />
                <text x="224" y="18" fill="#7AFFEB" fontSize="9" className="font-mono">
                    RUNNING
                </text>
                <text x="16" y="51" fill="#E2E8F0" fontSize="12" className="font-mono">
                    <tspan fill="#7AEBFF">$ </tspan>ptbk coder run
                </text>
                <GraphicCheck x={16} y={64} />
                <text x="40" y="76" fill="#B8CEC9" fontSize="12" className="font-mono">
                    01-auth.md
                </text>
                <text x="262" y="76" fill="#7AFFEB" fontSize="10" textAnchor="end" className="font-mono">
                    done
                </text>
                <rect
                    x="10"
                    y="88"
                    width="260"
                    height="37"
                    rx="7"
                    fill="#7AEBFF"
                    fillOpacity="0.07"
                    stroke="#7AEBFF"
                    strokeOpacity="0.16"
                />
                <path
                    d="M20 98L25 102L20 106"
                    stroke="#7AEBFF"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <text x="40" y="106" fill="#E3FAFF" fontSize="12" className="font-mono">
                    02-billing.md
                </text>
                <text x="258" y="105" fill="#7AEBFF" fontSize="10" textAnchor="end" className="font-mono">
                    coding
                </text>
                <rect x="40" y="115" width="218" height="2" rx="1" fill="#7AEBFF" fillOpacity="0.12" />
                <rect x="40" y="115" width="142" height="2" rx="1" fill="#7AEBFF" />
                <circle cx="23.5" cy="143" r="5" stroke="#607489" strokeDasharray="2 3" />
                <text x="40" y="147" fill="#8498AC" fontSize="12" className="font-mono">
                    03-settings.md
                </text>
            </GraphicWindow>
            <path
                d="M44 194V200Q44 208 52 208H120"
                stroke={paints.connection}
                strokeWidth="1.5"
                strokeDasharray="3 4"
            />
            <path
                d="M116 204L120 208L116 212"
                stroke="#7AFFEB"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <g transform="translate(132 183)">
                <rect
                    width="172"
                    height="34"
                    rx="9"
                    fill="#15312F"
                    stroke="#7AFFEB"
                    strokeOpacity="0.45"
                    filter={paints.shadow}
                />
                <GraphicCheck x={10} y={9} />
                <text x="33" y="22" fill="#C8FFF4" fontSize="12" fontWeight="500" className="font-sans">
                    Tested &amp; committed
                </text>
            </g>
        </g>
    );
}

/**
 * Draws a versioned Book file with interchangeable terminal harnesses around it.
 */
function PortableAgentGraphic({ paints }: { readonly paints: GraphicPaints }) {
    return (
        <g>
            <ellipse cx="160" cy="119" rx="127" ry="86" stroke="#7AEBFF" strokeOpacity="0.1" strokeDasharray="3 7" />
            <g stroke={paints.connection} strokeWidth="1.5">
                <path d="M73 54V79Q73 88 82 88H99" />
                <path d="M257 60V79Q257 88 248 88H221" />
                <path d="M99 145H79Q70 145 70 154V180" />
                <path d="M221 145H241Q250 145 250 154V180" />
            </g>
            <g fill="#7AEBFF">
                <circle cx="73" cy="68" r="3" />
                <circle cx="238" cy="88" r="3" />
                <circle cx="70" cy="165" r="3" />
                <circle cx="250" cy="169" r="3" />
            </g>
            <rect
                x="108"
                y="49"
                width="112"
                height="121"
                rx="11"
                fill="#1A3A48"
                stroke={paints.edge}
                transform="rotate(6 164 110)"
            />
            <g filter={paints.shadow}>
                <path
                    d="M111 48H192L222 78V160Q222 172 210 172H111Q99 172 99 160V60Q99 48 111 48Z"
                    fill={paints.surface}
                    stroke="#7AEBFF"
                    strokeOpacity="0.65"
                />
                <path d="M192 48V66Q192 78 204 78H222" fill="#204657" stroke="#7AEBFF" strokeOpacity="0.4" />
            </g>
            <path d="M115 67H124M115 72H129" stroke="#7AEBFF" strokeWidth="2" strokeLinecap="round" />
            <text x="114" y="104" fill="#E2FAFF" fontSize="23" fontWeight="500" className="font-mono">
                .book
            </text>
            <text x="114" y="126" fill="#7AEBFF" fontSize="10" className="font-mono">
                PERSONA
            </text>
            <path d="M169 123H205" stroke="#607D8D" strokeWidth="3" strokeLinecap="round" />
            <text x="114" y="143" fill="#7AFFEB" fontSize="10" className="font-mono">
                RULE
            </text>
            <path
                d="M152 140H193M114 157H183"
                stroke="#607D8D"
                strokeOpacity="0.55"
                strokeWidth="3"
                strokeLinecap="round"
            />
            {PORTABLE_HARNESSES.map((harness) => (
                <g key={harness.label} transform={`translate(${harness.x} ${harness.y})`}>
                    <rect
                        width={harness.width}
                        height="34"
                        rx="9"
                        fill={paints.surface}
                        stroke={paints.edge}
                        filter={paints.shadow}
                    />
                    <rect x="7" y="7" width="20" height="20" rx="5" fill={harness.color} fillOpacity="0.1" />
                    <path
                        d="M12 13L16 17L12 21M18 21H22"
                        stroke={harness.color}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <text x="34" y="21" fill={harness.color} fontSize="11" fontWeight="500" className="font-sans">
                        {harness.label}
                    </text>
                </g>
            ))}
        </g>
    );
}

/**
 * Draws completed PRD checkboxes and a code diff joining one reversible commit.
 */
function GitSyncedPrdGraphic({ paints }: { readonly paints: GraphicPaints }) {
    return (
        <g>
            <g stroke={paints.connection} strokeWidth="1.5">
                <path d="M84 149V163Q84 173 94 173H150Q160 173 160 183" />
                <path d="M236 159V163Q236 173 226 173H170Q160 173 160 183" />
            </g>
            <circle cx="84" cy="160" r="3" fill="#7AFFEB" />
            <circle cx="236" cy="166" r="3" fill="#7AFFEB" />
            <GraphicWindow x={18} y={29} width={132} height={120} title="PRD.md" paints={paints}>
                <text x="13" y="50" fill="#D4E2ED" fontSize="12" fontWeight="500" className="font-sans">
                    User sign-in
                </text>
                <GraphicCheck x={13} y={62} />
                <text x="35" y="74" fill="#B8CEC9" fontSize="11" className="font-sans">
                    Auth flow
                </text>
                <GraphicCheck x={13} y={86} />
                <text x="35" y="98" fill="#B8CEC9" fontSize="11" className="font-sans">
                    Add tests
                </text>
            </GraphicWindow>
            <GraphicWindow x={170} y={39} width={132} height={120} title="code.ts" paints={paints}>
                <text x="13" y="50" fill="#7AEBFF" fontSize="11" className="font-mono">
                    <tspan fill="#A5B4FC">export</tspan> {'{'}
                </text>
                {CODE_DIFF_LINES.map((line) => (
                    <g key={line.y}>
                        <rect x="9" y={line.y} width="114" height="14" rx="3" fill="#7AFFEB" fillOpacity="0.07" />
                        <path
                            d={`M14 ${line.y + 7}H20M17 ${line.y + 4}V${line.y + 10}`}
                            stroke="#7AFFEB"
                            strokeWidth="1.2"
                        />
                        <path
                            d={`M29 ${line.y + 7}H${line.endX}`}
                            stroke="#7AFFEB"
                            strokeOpacity="0.6"
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                    </g>
                ))}
            </GraphicWindow>
            <g transform="translate(68 183)">
                <rect
                    width="184"
                    height="37"
                    rx="10"
                    fill="#15312F"
                    stroke="#7AFFEB"
                    strokeOpacity="0.45"
                    filter={paints.shadow}
                />
                <path d="M12 18.5H20M32 18.5H40" stroke="#7AFFEB" strokeWidth="1.5" />
                <circle cx="26" cy="18.5" r="6" stroke="#7AFFEB" strokeWidth="1.5" />
                <text x="49" y="16" fill="#C8FFF4" fontSize="12" fontWeight="500" className="font-sans">
                    One commit
                </text>
                <text x="49" y="29" fill="#8ABBB1" fontSize="9" className="font-mono">
                    PRD + code
                </text>
                <path
                    d="M153 16A7 7 0 1 1 152 23M153 11V16H158"
                    stroke="#7AFFEB"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </g>
        </g>
    );
}
