import type { Request, Response } from 'express';
import type { Promisable } from 'type-fest';
import { really_any } from '../../_packages/types.index';
import type { PipelineCollection } from '../../collection/pipeline-collection/PipelineCollection';
import { AuthenticationError } from '../../errors/AuthenticationError';
import type { CommonToolsOptions } from '../../execution/CommonToolsOptions';
import type { ExecutionTools } from '../../execution/ExecutionTools';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type {
    string_app_id,
    string_email,
    string_password,
    string_token,
    string_user_id,
} from '../../types/typeAliases';
import type { ApplicationModeIdentification, Identification } from '../socket-types/_subtypes/Identification';

/**
 * Options for configuring the Promptbook remote server.
 *
 * There are two modes of remote server:
 *
 * 1) **Application mode** Server will receive `collection` and execute prompts only from this collection
 * 2) **Anonymous mode** Server will receive full `LlmToolsConfiguration` (with api keys) and just acts as a proxy
 *    In anonymous mode, `collection` will be ignored and any prompt will be executed
 *
 * You can enable both modes at the same time.
 *
 * @public exported from `@promptbook/remote-server`
 */
export type RemoteServerOptions<TCustomOptions> = CommonToolsOptions & {
    /**
     * Port on which the server will listen
     * @property {number} port The port number the server will listen on.
     */
    readonly port: number;

    /**
     * CORS options to apply to all endpoints (REST, UI, socket.io, etc.).
     * Accepts the same options as the `cors` npm package and socket.io's CORS config.
     * If not provided, defaults to permissive CORS (origin: '*').
     * @see https://www.npmjs.com/package/cors
     * @see https://socket.io/docs/v4/server-options/#cors
     */
    readonly cors?: {
        origin?: string | string[] | boolean;
        methods?: string | string[];
        allowedHeaders?: string | string[];
        exposedHeaders?: string | string[];
        credentials?: boolean;
        maxAge?: number;
        preflightContinue?: boolean;
        optionsSuccessStatus?: number;
        [key: string]: really_any;
    };
    // <- TODO: [🧠] Maybe pass just origins and other headers are set to values which are used in the server?

    /**
     * Enable rich UI (React + Tailwind) at `/` path.
     * Default: true
     * If false, server will respond with markdown as before.
     */
    readonly isRichUi?: boolean;

    /**
     * Creates execution tools the client
     *
     * This is relevant also in anonymous mode in opposition to `createLlmExecutionTools`
     *
     * Note: You can provide only some tools and leave the rest to the default ones also llm tools are created by `createLlmExecutionTools`
     * Note: This is useful when you want to provide some custom restrictions for example:
     * - Limit access to certain websites for some users
     * - Bind user-interface tools to email agent
     * - Allow / block script execution
     * - And many more
     */
    createExecutionTools?(
        options: Identification<TCustomOptions>,
    ): Promisable<Partial<Omit<ExecutionTools, 'llm'>>> /* <- TODO: [🍚] &({}|IDestroyable) */;
} & (
        | (AnonymousRemoteServerOptions & { readonly isApplicationModeAllowed?: false })
        | ({ readonly isAnonymousModeAllowed?: false } & ApplicationRemoteServerOptions<TCustomOptions>)
        | (AnonymousRemoteServerOptions & ApplicationRemoteServerOptions<TCustomOptions>)
    );

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
     * User tries to login to the server, this function will be called verify the user and return the identification or throw an error
     * This can be also doubled as a function to register the user
     *
     * Note: In most cases, you will return `PromptbookServer_ApplicationIdentification`
     *       `PromptbookServer_AnonymousIdentification` is useful only in scenarios when user stores its own api keys on the application server and
     *       server acts only as a api key provider
     *
     * Note: In most cases DO NOT THROW `AuthenticationError` but return `isSuccess: false` with message
     * @throws `AuthenticationError`  if the user is not allowed to login for example because of invalid credentials
     */
    login(loginRequest: LoginRequest): Promise<LoginResponse<TCustomOptions>>;

    /**
     * Creates llm execution tools for each client
     */
    createLlmExecutionTools(
        options: ApplicationModeIdentification<TCustomOptions>,
    ): Promisable<LlmExecutionTools> /* <- TODO: [🍚] &({}|IDestroyable) */;
};

export type ApplicationRemoteServerClientOptions<TCustomOptions> = {
    /**
     * Identifier of the application
     *
     * Note: This is useful when you use Promptbook remote server for multiple apps/frontends, if its used just for single app, use here just "app" or "your-app-name"
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
    readonly userToken?: string_token;

    /**
     * Additional arbitrary options to identify the client or to pass custom metadata
     */
    readonly customOptions?: TCustomOptions;
};

/**
 * Login request for the application mode
 */
export type LoginRequest = {
    /**
     * Identifier of the application you are using
     *
     * Note: This is useful when you use Promptbook remote server for multiple apps/frontends, if its used just for single app, use here just "app" or "your-app-name"
     */
    readonly appId: string_app_id | null;

    /**
     * Username (for example email) of the user
     */
    readonly username: string_email | string;

    /**
     * Password of the user
     */
    readonly password: string_password;

    /**
     * Request object from express if you want to access some request data for example headers, IP address, etc.
     */
    readonly rawRequest: Request;

    /**
     * Response object from express if you want to add some custom headers.
     *
     * Note: It is not recommended to use this object to send body of the response because it can confuse the client
     */
    readonly rawResponse: Response;
};

/**
 * Login response for the application mode
 */
export type LoginResponse<TCustomOptions> = {
    /**
     * Was the login successful
     */
    readonly isSuccess: boolean;

    /**
     * Message to display to the user, this message is always displayed
     */
    readonly message?: string;

    /**
     * Optional error if the login was not successful
     */
    readonly error?: AuthenticationError;

    /**
     * Identification of the user to be used in the future requests
     */
    readonly identification?: Identification<TCustomOptions>;
};

/**
 * TODO: Constrain anonymous mode for specific models / providers
 */
