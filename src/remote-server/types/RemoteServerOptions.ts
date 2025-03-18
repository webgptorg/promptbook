import type { Promisable } from 'type-fest';
import type { PipelineCollection } from '../../collection/PipelineCollection';
import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type { string_app_id, string_uri, string_user_id } from '../../types/typeAliases';

/**
 * @@@
 *
 * There are two modes of remote server:
 *
 * 1) **Application mode** Server will recieve `collection` and execute prompts only from this collection
 * 2) **Anonymous mode** Server will recieve full `LlmToolsConfiguration` (with api keys) and just acts as a proxy
 *    In anonymous mode, `collection` will be ignored and any prompt will be executed
 *
 * You can enable both modes at the same time.
 *
 * @public exported from `@promptbook/remote-client`
 * @public exported from `@promptbook/remote-server`
 */
export type RemoteServerOptions<TCustomOptions> = CommonToolsOptions & {
    /**
     * Port on which the server will listen
     */
    readonly port: number;

    /**
     * Root path of the server
     *
     * Note: This is useful when you reverse proxy the server without changing the path
     *
     * @default '/'
     * @example '/api/promptbook/'
     */
    readonly rootPath: string_uri;
} & (
        | AnonymousRemoteServerOptions
        | ApplicationRemoteServerOptions<TCustomOptions>
        | (AnonymousRemoteServerOptions & ApplicationRemoteServerOptions<TCustomOptions>)
    );
//           <- TODO: [🐛] Typescript bug in this discriminated union
//                    This should throw typescript error but it doesn't
//
//                    > startRemoteServer({
//                    >     path: '/promptbook',
//                    >     port: 4460,
//                    >     isAnonymousModeAllowed: true,
//                    >     isApplicationModeAllowed: true,
//                    > });

export type AnonymousRemoteServerOptions = {
    /**
     * Enable anonymous mode
     */
    readonly isAnonymousModeAllowed: true;
};

export type ApplicationRemoteServerOptions<TCustomOptions> = {
    /**
     * Enable application mode
     */
    readonly isApplicationModeAllowed: true;

    /**
     * Promptbook collection to use
     *
     * This is used to check validity of the prompt to prevent misuse
     */
    readonly collection: PipelineCollection;

    /**
     * Creates llm execution tools for each client
     */
    createLlmExecutionTools(
        options: ApplicationRemoteServerClientOptions<TCustomOptions>,
    ): Promisable<LlmExecutionTools> /* <- TODO: [🍚] &({}|IDestroyable) */;
};

export type ApplicationRemoteServerClientOptions<TCustomOptions> = {
    /**
     * Identifier of the application
     *
     * Note: This is usefull when you use Promptbook remote server for multiple apps/frontends, if its used just for single app, use here just "app" or "your-app-name"
     * Note: This can be some id or some semantic name like "email-agent"
     */
    readonly appId: string_app_id | null;

    /**
     * Identifier of the end user
     *
     * Note: This can be either some id or email or any other identifier
     * Note: This is also passed to the certain model providers to identify misuse
     */
    readonly userId?: string_user_id;

    /**
     * Token of the user to verify its identity
     * 
     * Note: This is passed for example to `createLlmExecutionTools`
     */
    readonly userToken?: string_user_id;

    /**
     * Additional arbitrary options to identify the client or to pass custom metadata
     */
    readonly customOptions?: TCustomOptions;
};

/**
 * TODO: Constrain anonymous mode for specific models / providers
 */
