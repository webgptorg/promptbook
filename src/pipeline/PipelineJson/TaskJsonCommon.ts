import type { ForeachJson } from '../../commands/FOREACH/ForeachJson';
import type { FormatCommand } from '../../commands/FORMAT/FormatCommand';
import type { SectionType } from '../../types/SectionType';
import type {
    string_javascript,
    string_markdown,
    string_markdown_text,
    string_name,
    string_parameter_name,
    string_postprocessing_function_name,
    string_prompt,
    string_template,
} from '../../types/typeAliases';
import type { Expectations } from './Expectations';

// TODO: !!!!!! Rename to CommonTaskJson

/**
 * Common properties of all tasks
 */
export type TaskJsonCommon = {
    /**
     * Name of the task
     * - It must be unique across the pipeline
     * - It should start uppercase and can contain letters and numbers
     * - The pipelineUrl together with hash and name are used to identify the task in the pipeline
     */
    readonly name: string_name;

    /**
     * Title of the task
     * It can use simple markdown formatting like **bold**, *italic*, [link](https://example.com), ... BUT not code blocks and structure
     */
    readonly title: string;

    /**
     * Description of the task
     * It can use multiple paragraphs of simple markdown formatting like **bold**, *italic*, [link](https://example.com), ... BUT not code blocks and structure
     */
    readonly description?: string_markdown_text;

    /**
     * List of parameter names that are used in the task and must be defined before the task is executed
     *
     * Note: Joker is one of the dependent parameters
     */
    readonly dependentParameterNames: Array<string_parameter_name>;
    //                                 <- TODO: [🪓] This should really be `ReadonlyArray`, but it causes problems

    /**
     * If theese parameters meet the expectations requirements, they are used instead of executing this task
     *
     * @see https://github.com/webgptorg/promptbook/discussions/66
     */
    readonly jokerParameterNames?: Array<string_parameter_name>;
    //                              <- TODO: [🪓] This should really be `ReadonlyArray`, but it causes problems

    /**
     * @@@
     */
    readonly foreach?: ForeachJson;

    /**
     * Type of the execution
     * This determines if the task is send to LLM, user or some scripting evaluation
     */
    readonly taskType: SectionType;

    /**
     * Content of the task with {placeholders} for parameters
     *
     * @@@ content vs preparedContent
     */
    readonly content: (string_prompt | string_javascript | string_markdown) & string_template;

    /**
     * @@@ Content of the task with {placeholders} for parameters
     *
     * @@@ content vs preparedContent
     *
     * @default "{content}"
     */
    readonly preparedContent?: (string_prompt | string_javascript | string_markdown) & string_template;

    /**
     * List of postprocessing steps that are executed after the task
     *
     * @see https://github.com/webgptorg/promptbook/discussions/31
     */
    readonly postprocessingFunctionNames?: Array<string_postprocessing_function_name>;
    //                                      <- TODO: [🪓] This should really be `ReadonlyArray`, but it causes problems

    /**
     * Expect this amount of each unit in the answer
     *
     * For example 5 words, 3 sentences, 2 paragraphs, ...
     *
     * Note: Expectations are performed after all postprocessing steps
     * @see https://github.com/webgptorg/promptbook/discussions/30
     */
    readonly expectations?: Expectations;

    /**
     * Expect this format of the answer
     *
     * Note: Expectations are performed after all postprocessing steps
     * @see https://github.com/webgptorg/promptbook/discussions/30
     * @deprecated [💝]
     */
    readonly format?: FormatCommand['format'];

    /**
     * Name of the parameter that is the result of the task
     */
    readonly resultingParameterName: string_name;
};

/**
 * TODO: use one helper type> (string_prompt | string_javascript | string_markdown) & string_template
 * TODO: [♈] Probbably move expectations from tasks to parameters
 */
