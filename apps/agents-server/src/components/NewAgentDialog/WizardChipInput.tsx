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
     * Optional renderer for visible chip labels.
     */
    readonly getChipLabel?: (chipValue: string, chipIndex: number) => string;

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
        getChipLabel,
        onDraftChange,
        onAdd,
        onRemove,
        removeLabel,
    } = props;
    const chipClassName =
        chipVariant === 'amber'
            ? 'border-amber-200 bg-amber-50 text-amber-900'
            : chipVariant === 'emerald'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-blue-200 bg-blue-50 text-blue-900';
    const iconClassName =
        chipVariant === 'amber'
            ? 'text-amber-700 hover:text-amber-900'
            : chipVariant === 'emerald'
              ? 'text-emerald-700 hover:text-emerald-900'
              : 'text-blue-700 hover:text-blue-900';

    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-800">{label}</label>
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
                            {getChipLabel?.(chip, index) || chip}
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
