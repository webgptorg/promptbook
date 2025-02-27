import type { string_markdown_text } from "../../types/typeAliases";
import type { string_pipeline_url } from "../../types/typeAliases";
import type { string_semantic_version } from "../../types/typeAliases";
import type { ExecutionPromptReportJson } from "./ExecutionPromptReportJson";

/**
 * ExecutionReport is result of executing one promptbook
 * It is kind of a variant of the promptbook usefull for debugging, logging and transparency for users.
 *
 * It can have 2 formats:
 * -   **.md file** created from the **JSON** format
 * -   _(this)_ **JSON** format
 *
 * Note: [🚉] This is fully serializable as JSON
 * @see https://github.com/webgptorg/promptbook#execution-report
 */
export type ExecutionReportJson = {
	/*
    TODO: [💼]
    > readonly type: 'REPORT';

    + make type test for this
    */

	/**
	 * Unique identifier of the pipeline from promptbook which was executed
	 */
	readonly pipelineUrl?: string_pipeline_url;

	/**
	 * Title of from promptbook which was executed
	 */
	readonly title?: string;

	/**
	 * Version from promptbook which was executed
	 */
	readonly promptbookUsedVersion: string_semantic_version;

	/**
	 * Version from promptbook which was requested by promptbook
	 */
	readonly promptbookRequestedVersion?: string_semantic_version;

	/**
	 * Description of the promptbook which was executed
	 */
	readonly description?: string_markdown_text;

	/**
	 * Sequence of tasks in order which were executed
	 */
	readonly promptExecutions: ReadonlyArray<ExecutionPromptReportJson>;
};
