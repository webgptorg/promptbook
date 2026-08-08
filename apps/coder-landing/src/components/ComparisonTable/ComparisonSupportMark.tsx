import type { ReactNode } from 'react';
import type { ComparisonSupportLevel } from '@/data/comparison';
import { COMPARISON_SUPPORT_LEVELS } from '@/data/comparison';

/**
 * Props of `<ComparisonSupportMark/>`.
 */
type ComparisonSupportMarkProps = {
    /**
     * Support level to draw
     */
    readonly level: ComparisonSupportLevel;
};

/**
 * Colors of the mark tile per support level.
 */
const MARK_CLASS_NAMES: Readonly<Record<ComparisonSupportLevel, string>> = {
    'built-in': 'border-promptbook-green-dark/60 bg-promptbook-green-dark/15 text-promptbook-green',
    'do-it-yourself': 'border-gray-600 bg-gray-800/60 text-gray-300',
    'not-available': 'border-gray-800 bg-gray-900 text-gray-600',
};

/**
 * Icon of the mark per support level - a check, a dash and a cross.
 */
const MARK_ICONS: Readonly<Record<ComparisonSupportLevel, ReactNode>> = {
    'built-in': <polyline points="5,9.5 8,12.5 14,5.5" />,
    'do-it-yourself': <line x1="5" y1="9" x2="13" y2="9" />,
    'not-available': (
        <g>
            <line x1="6" y1="6" x2="12" y2="12" />
            <line x1="12" y1="6" x2="6" y2="12" />
        </g>
    ),
};

/**
 * Renders the mark of one support level together with its accessible label.
 *
 * Note: Used both in the cells of the comparison table and in its legend,
 *       see [`specs/sections/comparison.md`](../../../specs/sections/comparison.md)
 */
export function ComparisonSupportMark({ level }: ComparisonSupportMarkProps) {
    return (
        <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${MARK_CLASS_NAMES[level]}`}
        >
            <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
            >
                {MARK_ICONS[level]}
            </svg>
            <span className="sr-only">{COMPARISON_SUPPORT_LEVELS[level].label}</span>
        </span>
    );
}
