import type { ReactNode } from 'react';

/**
 * Visual variants for selectable wizard cards.
 *
 * @private internal type of <NewAgentWizard/>.
 */
export type WizardCardVariant = 'blue' | 'emerald' | 'amber';

/**
 * Props for one selectable wizard preset card.
 */
type WizardSelectableCardProps = {
    /**
     * Emoji icon shown in the card header.
     */
    readonly icon: string;

    /**
     * Main label shown in the card header.
     */
    readonly label: string;

    /**
     * Whether the card is currently selected.
     */
    readonly isSelected: boolean;

    /**
     * Whether the card is interactive.
     */
    readonly isDisabled?: boolean;

    /**
     * Color theme for selected state.
     */
    readonly variant?: WizardCardVariant;

    /**
     * Optional secondary note displayed under the label.
     */
    readonly note?: string;

    /**
     * Optional rich content rendered under the heading.
     */
    readonly children?: ReactNode;

    /**
     * Handles card selection.
     */
    readonly onClick?: () => void;
};

/**
 * Returns the selected-state classes for a given card variant.
 *
 * @param variant - Visual variant.
 * @returns Tailwind class string for selected state.
 */
function getSelectedCardClassName(variant: WizardCardVariant): string {
    if (variant === 'emerald') {
        return 'border-emerald-500 bg-emerald-50 text-emerald-950 shadow-emerald-100';
    }

    if (variant === 'amber') {
        return 'border-amber-500 bg-amber-50 text-amber-950 shadow-amber-100';
    }

    return 'border-blue-500 bg-blue-50 text-blue-950 shadow-blue-100';
}

/**
 * Renders one reusable selectable wizard card.
 *
 * @param props - Card props.
 * @returns Selectable preset card.
 *
 * @private internal component of <NewAgentWizard/>.
 */
export function WizardSelectableCard(props: WizardSelectableCardProps) {
    const { icon, label, isSelected, isDisabled = false, variant = 'blue', note, children, onClick } = props;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isDisabled}
            className={`flex min-h-24 flex-col rounded-xl border p-3 text-left transition ${
                isDisabled
                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500'
                    : isSelected
                      ? `shadow-sm ${getSelectedCardClassName(variant)}`
                      : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
            }`}
        >
            <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">
                    {icon}
                </span>
                <span className="text-sm font-semibold">{label}</span>
            </div>
            {note && <p className="mt-1 text-xs leading-5 opacity-80">{note}</p>}
            {children && <div className="mt-3">{children}</div>}
        </button>
    );
}
