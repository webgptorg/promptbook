import type { string_user_id } from "../types/typeAliases";

/**
 * @@@
 *
 * Note: Keep it public to allow people to make their own execution tools
 */
export type CommonToolsOptions = {
	/**
	 * A unique identifier representing your end-user
	 *
	 * Note: For example it can help to detect abuse
	 * For example for OpenAi @see https://platform.openai.com/docs/guides/safety-best-practices/end-user-ids
	 */
	readonly userId?: string_user_id;

	/**
	 * If true, the internal executions will be logged
	 */
	readonly isVerbose?: boolean;
};

/**
 * TODO: [🧠][🤺] Maybe allow overriding of `userId` for each prompt
 * TODO: [🈁] Maybe add here `isDeterministic`
 * TODO: [🧠][💙] Distinct between options passed into ExecutionTools and to ExecutionTools.execute
 */
