import type { CoreBenefitIllustration } from '@/data/coreBenefits';

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
 * Renders a centered, code-native illustration for one core `ptbk coder` benefit.
 */
export function CoreBenefitGraphic({ illustration }: CoreBenefitGraphicProps) {
    return (
        <div
            className="flex h-40 w-full items-center justify-center overflow-hidden rounded-xl border border-gray-800/80 bg-gray-950/30"
            aria-hidden
        >
            {illustration === 'autopilot' && <AutopilotGraphic />}
            {illustration === 'portable-agent' && <PortableAgentGraphic />}
            {illustration === 'git-synced-prd' && <GitSyncedPrdGraphic />}
        </div>
    );
}

/**
 * Draws the autonomous queue, checks, and commit loop.
 */
function AutopilotGraphic() {
    return (
        <svg className="h-36 w-full max-w-[15rem]" viewBox="0 0 240 144" fill="none">
            <path
                d="M36 94C36 116 62 128 90 128H160C188 128 204 116 204 94"
                stroke="#30A8BD"
                strokeWidth="2"
                strokeDasharray="4 6"
                opacity="0.65"
            />
            <path d="M200 90L204 95L208 90" stroke="#7AEBFF" strokeWidth="2" strokeLinecap="round" />
            <rect x="35" y="24" width="170" height="86" rx="15" fill="#111827" stroke="#374151" />
            <path d="M35 46H205" stroke="#374151" />
            <circle cx="51" cy="35" r="3" fill="#7AEBFF" />
            <circle cx="61" cy="35" r="3" fill="#7AFFEB" opacity="0.7" />
            <rect x="54" y="59" width="54" height="14" rx="5" fill="#1F2937" />
            <path d="M62 66H82" stroke="#7AEBFF" strokeWidth="2" strokeLinecap="round" />
            <rect x="54" y="81" width="54" height="14" rx="5" fill="#1F2937" />
            <path d="M62 88H77" stroke="#7AEBFF" strokeWidth="2" strokeLinecap="round" />
            <rect x="125" y="57" width="55" height="40" rx="8" fill="#0F172A" stroke="#30A8BD" />
            <path
                d="M138 76L146 84L166 66"
                stroke="#7AFFEB"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M110 77H121" stroke="#7AEBFF" strokeWidth="2" strokeLinecap="round" />
            <path
                d="M116 72L121 77L116 82"
                stroke="#7AEBFF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle cx="120" cy="15" r="9" fill="#30A8BD" fillOpacity="0.18" stroke="#7AEBFF" />
            <path d="M116.5 15H123.5M120 11.5V18.5" stroke="#7AEBFF" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    );
}

/**
 * Draws one versioned Book file connected to interchangeable harnesses.
 */
function PortableAgentGraphic() {
    return (
        <svg className="h-36 w-full max-w-[15rem]" viewBox="0 0 240 144" fill="none">
            <path d="M96 69L55 50M144 69L185 50M120 98V119" stroke="#30A8BD" strokeWidth="2" />
            <circle cx="48" cy="47" r="19" fill="#111827" stroke="#D97757" strokeWidth="2" />
            <path
                d="M48 36V58M37 47H59M40.5 39.5L55.5 54.5M55.5 39.5L40.5 54.5"
                stroke="#D97757"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
            <circle cx="192" cy="47" r="19" fill="#111827" stroke="#F3F4F6" strokeWidth="2" />
            <path
                d="M192 35L202 41V53L192 59L182 53V41L192 35Z"
                stroke="#F3F4F6"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
            <circle cx="192" cy="47" r="4" stroke="#F3F4F6" strokeWidth="1.8" />
            <rect x="99" y="43" width="42" height="59" rx="9" fill="#0F172A" stroke="#7AEBFF" strokeWidth="2" />
            <path d="M129 43V55H141" stroke="#7AEBFF" strokeWidth="2" strokeLinejoin="round" />
            <path d="M107 68H132M107 78H128M107 88H123" stroke="#30A8BD" strokeWidth="2" strokeLinecap="round" />
            <text x="120" y="62" fill="#7AFFEB" fontSize="9" fontFamily="monospace" textAnchor="middle">
                .book
            </text>
            <rect x="90" y="118" width="60" height="18" rx="9" fill="#111827" stroke="#7AFFEB" />
            <path
                d="M101 124L107 127L101 130M113 130H123"
                stroke="#7AFFEB"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <text x="133" y="130" fill="#7AFFEB" fontSize="8" fontFamily="monospace" textAnchor="middle">
                local
            </text>
        </svg>
    );
}

/**
 * Draws the PRD status and code flowing into one reversible git commit.
 */
function GitSyncedPrdGraphic() {
    return (
        <svg className="h-36 w-full max-w-[15rem]" viewBox="0 0 240 144" fill="none">
            <rect x="29" y="31" width="70" height="63" rx="10" fill="#111827" stroke="#7AEBFF" strokeWidth="2" />
            <path d="M82 31V45H99" stroke="#7AEBFF" strokeWidth="2" strokeLinejoin="round" />
            <rect x="42" y="48" width="18" height="14" rx="4" fill="#30BDA8" fillOpacity="0.25" stroke="#7AFFEB" />
            <path
                d="M46 55L49.5 58.5L56 51.5"
                stroke="#7AFFEB"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M67 54H87M42 73H82" stroke="#30A8BD" strokeWidth="2" strokeLinecap="round" />
            <text x="64" y="87" fill="#9CA3AF" fontSize="8" fontFamily="monospace" textAnchor="middle">
                PRD.md
            </text>
            <rect x="141" y="31" width="70" height="63" rx="10" fill="#111827" stroke="#7AEBFF" strokeWidth="2" />
            <path
                d="M159 51L151 62L159 73M193 51L201 62L193 73M177 48L170 76"
                stroke="#7AFFEB"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <text x="176" y="87" fill="#9CA3AF" fontSize="8" fontFamily="monospace" textAnchor="middle">
                code
            </text>
            <path d="M64 95L99 112M176 95L141 112" stroke="#30A8BD" strokeWidth="2" />
            <path
                d="M95 108L100 113L93 114M145 108L140 113L147 114"
                stroke="#7AEBFF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <rect x="86" y="107" width="68" height="25" rx="12.5" fill="#0F172A" stroke="#30BDA8" />
            <circle cx="101" cy="119.5" r="6" fill="#30BDA8" />
            <path
                d="M98 119.5L100.5 122L105 117"
                stroke="#111827"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <text x="128" y="122.5" fill="#7AFFEB" fontSize="9" fontFamily="monospace" textAnchor="middle">
                commit
            </text>
            <path d="M29 108C36 120 48 124 60 120" stroke="#7AEBFF" strokeWidth="1.8" strokeLinecap="round" />
            <path
                d="M57 116L61 120L55 123"
                stroke="#7AEBFF"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
