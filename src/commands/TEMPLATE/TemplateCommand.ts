import type { TaskType } from './TaskTypes';

/**
 * Parsed TEMPLATE command
 *
 * @see ./templateCommandParser.ts for more details
 * @private within the commands folder
 */
export type TemplateCommand = {
    readonly type: 'TEMPLATE';
    readonly taskType: TaskType;
};
