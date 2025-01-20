import type { SectionType } from '../../types/SectionType';

/**
 * Parsed SECTION command
 *
 * @see ./sectionCommandParser.ts for more details
 * @public exported from `@promptbook/editable`
 */
export type SectionCommand = {
    readonly type: 'SECTION';
    readonly taskType: SectionType;
};
