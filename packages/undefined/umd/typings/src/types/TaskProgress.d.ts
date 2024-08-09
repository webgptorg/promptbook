import type { BlockType } from '../commands/BLOCK/BlockTypes';
import type { string_markdown_text } from './typeAliases';
import type { string_name } from './typeAliases';
/**
 * TaskProgress represents the progress of a Promptbook execution.
 */
export type TaskProgress = {
    /**
     * The unique name of the task.
     *
     * Note: This is not supposed to be displayed to the user.
     *       It is used to identify the task in the code, for example as react key
     */
    readonly name: string_name;
    /**
     * Title of the task.
     *
     * Note: This is supposed to be displayed to the user.
     * Note: This is trimmed and stripped of HTML tags and emojis
     */
    readonly title: string_markdown_text;
    /**
     * Does the task started?
     */
    readonly isStarted: boolean;
    /**
     * Is task done?
     */
    readonly isDone: boolean;
    /**
     * The type of the execution.
     * Note: The pipeline executor reports everything, in the app level you can filter out the execution types that you don't want to show to the user.
     */
    readonly blockType: BlockType;
    /**
     * The parameter name that is being processed.
     */
    readonly parameterName: string_name;
    /**
     * The parameter value or null if the parameter is not yet processed.
     */
    readonly parameterValue: string | null;
};
