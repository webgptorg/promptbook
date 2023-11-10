import { string_name, string_title } from './typeAliases';

/**
 * TaskProgress represents the progress of a PromptTemplatePipeline execution.
 */
export interface TaskProgress {
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
     * Note: This is trimmed and stripped of HTML tags and emojis with "🖋" prefix
     */
    readonly title: string_title;

    /**
     * Does the task started?
     */
    readonly isStarted: boolean;

    /**
     * Is task done?
     */
    readonly isDone: boolean;

    /**
     * The parameter name that is being processed.
     */
    readonly parameterName: string_name;

    /**
     * The parameter value or null if the parameter is not yet processed.
     */
    readonly parameterValue: string | null;
}
