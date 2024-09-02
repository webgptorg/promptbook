import type { TemplateType } from './TemplateTypes';

/**
 * Parsed TEMPLATE command
 *
 * @see ./templateCommandParser.ts for more details
 * @private within the commands folder
 */
export type TemplateCommand = {
    readonly type: 'TEMPLATE';
    readonly templateType: TemplateType;
};
