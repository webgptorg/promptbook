import type { PipelineCollection } from '../../../collection/PipelineCollection';
import type { CommonToolsOptions } from '../../../execution/CommonToolsOptions';
import type { LlmExecutionTools } from '../../../execution/LlmExecutionTools';
import type { string_uri } from '../../../types/typeAliases';
import type { string_user_id } from '../../../types/typeAliases';

/**
 * @@@
 *
 * There are two modes of remote server:
 *
 * 1) **Collection mode** Server will recieve `collection` and execute prompts only from this collection
 * 2) **Anonymous mode** Server will recieve full `LlmToolsConfiguration` (with api keys) and just acts as a proxy
 *    In anonymous mode, `collection` will be ignored and any prompt will be executed
 *
 * You can enable both modes at the same time.
 *
 * @public exported from `@promptbook/remote-client`
 * @public exported from `@promptbook/remote-server`
 */
export type RemoteServerOptions = CommonToolsOptions & {
    /**
     * Port on which the server will listen
     */
    readonly port: number;

    /**
     * Path for the Socket.io server to listen
     *
     * @default '/socket.io'
     * @example '/promptbook/socket.io'
     */
    readonly path: string_uri;
} & (
        | AnonymousRemoteServerOptions
        | CollectionRemoteServerOptions
        | (AnonymousRemoteServerOptions & CollectionRemoteServerOptions)
    );
//           <- TODO: [🐛] Typescript bug in this discriminated union
//                    This should throw typescript error but it doesn't
//
//                    > startRemoteServer({
//                    >     path: '/promptbook',
//                    >     port: 4460,
//                    >     isAnonymousModeAllowed: true,
//                    >     isCollectionModeAllowed: true,
//                    > });

export type AnonymousRemoteServerOptions = {
    /**
     * Enable anonymous mode
     */
    readonly isAnonymousModeAllowed: true;
};

export type CollectionRemoteServerOptions = {
    /**
     * Enable collection mode
     */
    readonly isCollectionModeAllowed: true;

    /**
     * Promptbook collection to use
     *
     * This is used to check validity of the prompt to prevent misuse
     */
    readonly collection: PipelineCollection;

    /**
     * Creates llm execution tools for each client
     */
    createLlmExecutionTools(userId: string_user_id | undefined): LlmExecutionTools /* <- TODO: &({}|IDestroyable) */;
};

/**
 * TODO: Constrain anonymous mode for specific models / providers
 * TODO: [🧠][🤺] Remove `createLlmExecutionTools`, pass just `llmExecutionTools`
 */
