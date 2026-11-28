import { cn } from '../../lib/cn';

/**
 * Ambient identity artwork woven into the accent rail — a large, faint "book → spark"
 * motif (the same story as the logomark) that bleeds off the panel edges rather than
 * sitting in a box. Purely decorative; white line art over the indigo gradient.
 */
export function RailArtwork({ className }: { readonly className?: string }) {
    return (
        <svg
            viewBox="0 0 320 480"
            preserveAspectRatio="xMidYMax slice"
            className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
            fill="none"
            aria-hidden="true"
        >
            <g stroke="#7aebff">
                {/* faint concentric rings around the spark */}
                <g strokeOpacity="0.14" strokeWidth="1">
                    <circle cx="232" cy="150" r="34" />
                    <circle cx="232" cy="150" r="58" />
                    <circle cx="232" cy="150" r="86" />
                </g>

                {/* large open book, bleeding off the bottom */}
                <g strokeOpacity="0.28" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
                    <path d="M150 360 L40 388 L40 500 L150 478 Z" />
                    <path d="M150 360 L260 388 L260 500 L150 478 Z" />
                    <line x1="150" y1="360" x2="150" y2="478" />
                    <g strokeOpacity="0.18" strokeWidth="1.3">
                        <line x1="60" y1="402" x2="128" y2="416" />
                        <line x1="60" y1="420" x2="128" y2="434" />
                        <line x1="172" y1="416" x2="240" y2="402" />
                        <line x1="172" y1="434" x2="240" y2="420" />
                    </g>
                </g>

                {/* flow rising from the spine to the spark */}
                <g strokeOpacity="0.24" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M150 356 C 178 286, 196 232, 232 158" />
                    <path d="M150 352 C 200 300, 214 226, 230 160" />
                </g>

                {/* spark */}
                <g strokeOpacity="0.6" strokeWidth="1.6" strokeLinecap="round">
                    <line x1="232" y1="132" x2="232" y2="144" />
                    <line x1="232" y1="156" x2="232" y2="168" />
                    <line x1="214" y1="150" x2="226" y2="150" />
                    <line x1="238" y1="150" x2="250" y2="150" />
                </g>
            </g>
            <circle cx="232" cy="150" r="5.5" fill="#7aebff" fillOpacity="0.7" />
            <g fill="#7aebff" fillOpacity="0.35">
                <circle cx="196" cy="206" r="2.5" />
                <circle cx="262" cy="104" r="2" />
                <circle cx="150" cy="318" r="2" />
            </g>
        </svg>
    );
}
