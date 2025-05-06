import type { PipelineInterface } from '../../pipeline/PipelineInterface/PipelineInterface';
import type { string_markdown_text } from '../../types/typeAliases';
import type { string_name } from '../../types/typeAliases';
import type { string_promptbook_documentation_url } from '../../types/typeAliases';
import type { string_SCREAMING_CASE } from '../../utils/normalization/normalizeTo_SCREAMING_CASE';

/**
 * AbstractFormfactorDefinition provides the base structure for all form factor implementations
 * in the Promptbook system. It defines common properties and interfaces that must be
 * implemented by specific form factors.
 *
 * Note: [🚉] This is fully serializable as JSON
 * @see https://github.com/webgptorg/promptbook/discussions/172
 */
export type AbstractFormfactorDefinition = {
    /**
     * Unique identifier for the form factor in SCREAMING_CASE format
     * Used for programmatic identification and reference
     */
    readonly name: string_name & string_SCREAMING_CASE;

    /**
     * Alternative names that can be used to reference this form factor
     * Also in SCREAMING_CASE format for consistency
     */
    readonly aliasNames?: ReadonlyArray<string_name & string_SCREAMING_CASE>;

    /**
     * Previous names that were used for this form factor but are now deprecated
     * These are maintained for backward compatibility purposes
     */
    readonly deprecatedNames?: ReadonlyArray<string_name & string_SCREAMING_CASE>;

    /**
     * Human-readable description of the form factor in markdown format
     * Explains the purpose, functionality, and use cases of this form factor
     */
    readonly description: string_markdown_text;

    /**
     * URL pointing to detailed documentation for this form factor
     * Provides additional resources and guidance for implementation and usage
     */
    readonly documentationUrl: string_promptbook_documentation_url;

    /**
     * Defines the interface structure for this form factor's pipeline
     * Specifies how inputs and outputs are handled, processed, and formatted
     * Required for properly configuring and executing the form factor's functionality
     */
    readonly pipelineInterface: PipelineInterface;

    // <- TODO: [🍼] Add here CLI interactive behavior definition
};

/**
 * TODO: [🧠][🤓] How to pass optional parameters - for example summary in FORMFACTOR Translator
 */
