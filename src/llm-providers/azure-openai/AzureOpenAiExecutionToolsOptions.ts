import type { CommonToolsOptions } from "../../execution/CommonToolsOptions";
import type { string_name } from "../../types/typeAliases";
import type { string_token } from "../../types/typeAliases";
import type { string_user_id } from "../../types/typeAliases";

/**
 * Options for `AzureOpenAiExecutionTools`
 *
 * @see https://oai.azure.com/portal/
 * @public exported from `@promptbook/azure-openai`
 */
export type AzureOpenAiExecutionToolsOptions = CommonToolsOptions & {
	/**
	 * The resource name of the Azure OpenAI resource
	 *
	 * Note: Typically you have one resource and multiple deployments.
	 */
	readonly resourceName: string_name;

	/**
	 * The deployment name
	 *
	 * Note: If you specify modelName in prompt, it will be used instead of deploymentName
	 * Note: This is kind of a modelName in OpenAI terms
	 * Note: Typically you have one resource and multiple deployments.
	 */
	readonly deploymentName: string_name;

	/**
	 * The API key of the Azure OpenAI resource
	 */
	readonly apiKey: string_token;

	/**
	 * A unique identifier representing your end-user, which can help Azure OpenAI to monitor
	 * and detect abuse.
	 *
	 * @see https://platform.openai.com/docs/guides/safety-best-practices/end-user-ids (document from OpenAI not Azure, but same concept)
	 */
	readonly userId?: string_user_id;
	// <- TODO: [🧠][🤺] Maybe allow overriding of `userId` for each prompt
};
