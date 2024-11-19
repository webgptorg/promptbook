import { string_SCREAMING_CASE } from '../../_packages/types.index';
import { string_markdown_text, string_name, string_promptbook_documentation_url } from '../../types/typeAliases';

/**
 * @@@
 */
export type AbstractFormfactorDefinition = {
    /**
     * @@@
     */
    readonly name: string_name & string_SCREAMING_CASE;

    /**
     * @@@
     */
    readonly aliasNames?: ReadonlyArray<string_name & string_SCREAMING_CASE>;

    /**
     * @@@
     */
    readonly deprecatedNames?: ReadonlyArray<string_name & string_SCREAMING_CASE>;

    /**
     * @@@
     */
    readonly description: string_markdown_text;

    /**
     * @@@
     */
    readonly documentationUrl: string_promptbook_documentation_url;
};
