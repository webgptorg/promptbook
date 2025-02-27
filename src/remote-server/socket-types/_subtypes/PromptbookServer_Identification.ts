import type { LlmToolsConfiguration } from "../../../llm-providers/_common/register/LlmToolsConfiguration";
import type { string_user_id } from "../../../types/typeAliases";
import type { ApplicationRemoteServerClientOptions } from "../../types/RemoteServerOptions";

/**
 * Identification of client for Socket.io remote server
 *
 * @public exported from `@promptbook/remote-server`
 * @public exported from `@promptbook/remote-client`
 */
export type PromptbookServer_Identification<TCustomOptions> =
	| PromptbookServer_ApplicationIdentification<TCustomOptions>
	| PromptbookServer_AnonymousIdentification;

/**
 * Application mode is situation when you run known and well-defined books with your own api keys
 *
 * @public exported from `@promptbook/remote-server`
 * @public exported from `@promptbook/remote-client`
 */
export type PromptbookServer_ApplicationIdentification<TCustomOptions> =
	ApplicationRemoteServerClientOptions<TCustomOptions> & {
		/**
		 * Application mode
		 */
		readonly isAnonymous: false;
	};

/**
 * Anonymous mode is when you run arbitrary user books without api keys from user
 *
 * Note: This is useful in situations when the LLM provider does not allow to call the API requests from the client side
 *       It is kind of a proxy mode
 *
 * @public exported from `@promptbook/remote-server`
 * @public exported from `@promptbook/remote-client`
 */
export type PromptbookServer_AnonymousIdentification = {
	/**
	 * Anonymous mode
	 */
	readonly isAnonymous: true;

	/**
	 * Identifier of the end user
	 *
	 * Note: this is passed to the certain model providers to identify misuse
	 * Note: In anonymous mode, there is no need to identify yourself, nor does it change the actual configuration of LLM Tools (unlike in application mode)
	 */
	readonly userId?: string_user_id;

	/**
	 * Configuration for the LLM tools
	 */
	readonly llmToolsConfiguration: LlmToolsConfiguration;
};

/**
 * TODO: [🧠][🛍] Maybe not `isAnonymous: boolean` BUT `mode: 'ANONYMOUS'|'COLLECTION'`
 * TODO: [🧠][🤺] Maybe allow overriding of `userId` for each prompt - Pass `userId` in `PromptbookServer_ListModels_Request`
 */
