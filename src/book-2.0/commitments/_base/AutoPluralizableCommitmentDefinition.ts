import type { BookCommitment } from './BookCommitment';
import type { CommitmentDefinition } from './CommitmentDefinition';
import { BaseCommitmentDefinition } from './BaseCommitmentDefinition';
import { getCanonicalForm, getBothForms } from './CommitmentPluralUtils';

/**
 * Extended base commitment definition that automatically supports both singular and plural forms
 *
 * This class creates commitment definitions that can handle both forms (e.g., RULE and RULES)
 * while maintaining a single implementation. The canonical form is always singular.
 *
 * @private
 */
export abstract class AutoPluralizableCommitmentDefinition<TCanonicalType extends string>
    extends BaseCommitmentDefinition<TCanonicalType | string>
    implements CommitmentDefinition
{
    /**
     * The canonical (singular) form of this commitment type
     */
    public readonly canonicalType: TCanonicalType;

    /**
     * The plural form of this commitment type
     */
    public readonly pluralType: string;

    /**
     * Both forms that this commitment accepts
     */
    public readonly acceptedTypes: readonly [string, string];

    constructor(type: TCanonicalType | string) {
        // Always normalize to canonical form for consistency
        const canonicalType = getCanonicalForm(type) as TCanonicalType;
        super(type);

        this.canonicalType = canonicalType;
        const [singular, plural] = getBothForms(canonicalType);
        this.pluralType = plural;
        this.acceptedTypes = [singular, plural] as const;
    }

    /**
     * Checks if this commitment definition can handle the given type
     * @param type The commitment type to check
     * @returns True if this definition handles the given type
     */
    canHandle(type: BookCommitment): boolean {
        return this.acceptedTypes.includes(type);
    }

    /**
     * Gets the display name for this commitment type
     * In documentation and descriptions, we typically show both forms
     */
    get displayName(): string {
        return `${this.canonicalType}/${this.pluralType}`;
    }

    /**
     * Override the documentation to include information about both forms
     */
    abstract get documentation(): string;

    /**
     * The description should mention that both singular and plural forms work
     */
    abstract get description(): string;

    /**
     * Helper method for subclasses to create documentation that mentions both forms
     */
    protected createDocumentationWithBothForms(content: string): string {
        const bothFormsNote = `
## Accepted Forms

Both \`${this.canonicalType}\` and \`${this.pluralType}\` work identically and can be used interchangeably.

${content}`;
        return bothFormsNote;
    }

    /**
     * Helper method for subclasses to create descriptions that mention both forms work
     */
    protected createDescriptionWithBothForms(baseDescription: string): string {
        return `${baseDescription} (Both \`${this.canonicalType}\` and \`${this.pluralType}\` work identically)`;
    }
}

/**
 * Factory function to create commitment definitions that support both singular and plural forms
 * This is a convenience function to create instances for both forms from a single definition class
 *
 * @param DefinitionClass The commitment definition class to instantiate
 * @param canonicalType The canonical (singular) type
 * @returns Array of commitment definition instances for both singular and plural forms
 */
export function createBothForms<T extends AutoPluralizableCommitmentDefinition<string>>(
    DefinitionClass: new (type: string) => T,
    canonicalType: string
): [T, T] {
    const [singular, plural] = getBothForms(canonicalType);
    return [
        new DefinitionClass(singular),
        new DefinitionClass(plural)
    ];
}
