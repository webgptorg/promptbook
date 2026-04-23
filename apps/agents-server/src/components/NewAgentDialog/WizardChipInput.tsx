import { X } from 'lucide-react';
import { NewAgentWizardClassNames } from './NewAgentWizardClassNames';
import type { WizardCardVariant } from './WizardSelectableCard';

/**
 * Props for one reusable chip-input section.
 */
type WizardChipInputProps = {
    /**
     * Visible field label.
     */
    readonly label: string;

    /**
     * Current input value.
     */
    readonly draftValue: string;

    /**
     * Placeholder shown in the input.
     */
    readonly placeholder: string;

    /**
     * Collected chips.
     */
    readonly chips: ReadonlyArray<string>;

    /**
     * Visual theme for chip rendering.
     */
    readonly chipVariant?: WizardCardVariant;

    /**
     * Updates the input draft.
     */
    readonly onDraftChange: (nextValue: string) => void;

    /**
     * Adds the current draft as a chip.
     */
    readonly onAdd: () => void;

    /**
     * Removes a single chip by index.
     */
    readonly onRemove: (chipIndex: number) => void;

    /**
     * Accessible remove label.
     */
    readonly removeLabel: string;
};

/**
 * Renders a reusable chip-input section with removable chips.
 *
 * @param props - Chip input props.
 * @returns Label, input, and chip list.
 *
 * @private internal component of <NewAgentWizard/>.
 */
export function WizardChipInput(props: WizardChipInputProps) {
    const {
        label,
        draftValue,
        placeholder,
        chips,
        chipVariant = 'blue',
        onDraftChange,
        onAdd,
        onRemove,
        removeLabel,
    } = props;
    const chipClassName =
        chipVariant === 'amber'
            ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/12 dark:text-amber-100'
            : chipVariant === 'emerald'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/12 dark:text-emerald-100'
              : 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/12 dark:text-blue-100';
    const iconClassName =
        chipVariant === 'amber'
            ? 'text-amber-700 hover:text-amber-900 dark:text-amber-200 dark:hover:text-amber-100'
            : chipVariant === 'emerald'
              ? 'text-emerald-700 hover:text-emerald-900 dark:text-emerald-200 dark:hover:text-emerald-100'
              : 'text-blue-700 hover:text-blue-900 dark:text-blue-200 dark:hover:text-blue-100';

    return (
        <div>
            <label className={NewAgentWizardClassNames.fieldLabel}>{label}</label>
            <input
                value={draftValue}
                onChange={(event) => onDraftChange(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key !== 'Enter') {
                        return;
                    }

                    event.preventDefault();
                    onAdd();
                }}
                placeholder={placeholder}
                className={NewAgentWizardClassNames.input}
            />
            {chips.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {chips.map((chip, index) => (
                        <span
                            key={`${chip}-${index}`}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm ${chipClassName}`}
                        >
                            {chip}
                            <button
                                type="button"
                                onClick={() => onRemove(index)}
                                className={`transition ${iconClassName}`}
                                aria-label={removeLabel}
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
