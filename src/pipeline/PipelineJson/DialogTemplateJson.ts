import type { TaskJsonCommon } from './TaskJsonCommon';

/**
 * Template for prompt to user
 *
 * Note: [🚉] This is fully serializable as JSON
 * @see https://github.com/webgptorg/promptbook/discussions/76
 */
export type DialogTaskJson = TaskJsonCommon & {
    readonly taskType: 'DIALOG_TEMPLATE_TASK';
};

/**
 * TODO: [🍙] Make some standard order of json properties
 */
