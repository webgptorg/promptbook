import type { CommonTaskJson } from './CommonTaskJson';

/**
 * Task for prompt to user
 *
 * Note: [🚉] This is fully serializable as JSON
 *
 * @see https://github.com/webgptorg/promptbook/discussions/76
 */
export type DialogTaskJson = CommonTaskJson & {
    readonly taskType: 'DIALOG_TASK';
};

// TODO: [🍙] Make some standard order of json properties
