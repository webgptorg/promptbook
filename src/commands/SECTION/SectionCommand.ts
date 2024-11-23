import type { SectionType } from './SectionTypes';

/**
 * Parsed TEMPLATE command
 *
 * @see ./sectionCommandParser.ts for more details
 * @private within the commands folder
 */
export type TemplateCommand = {
    readonly type: 'TEMPLATE';
    readonly taskType: SectionType;
};
