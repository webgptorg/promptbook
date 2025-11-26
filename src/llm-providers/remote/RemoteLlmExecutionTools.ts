import type { ChatParticipant } from '../../book-components/Chat/types/ChatParticipant';
import { deserializeError } from '../../errors/utils/deserializeError';
import type { AvailableModel } from '../../execution/AvailableModel';
import type { LlmExecutionTools } from '../../execution/LlmExecutionTools';
import type {
    ChatPromptResult,
    CompletionPromptResult,
    EmbeddingPromptResult,
    PromptResult,
} from '../../execution/PromptResult';
import { createRemoteClient } from '../../remote-server/createRemoteClient';
import type { PromptbookServer_Error } from '../../remote-server/socket-types/_common/PromptbookServer_Error';
import type { PromptbookServer_ListModels_Request } from '../../remote-server/socket-types/listModels/PromptbookServer_ListModels_Request';
import type { PromptbookServer_ListModels_Response } from '../../remote-server/socket-types/listModels/PromptbookServer_ListModels_Response';
import type { PromptbookServer_Prompt_Request } from '../../remote-server/socket-types/prompt/PromptbookServer_Prompt_Request';
import type { PromptbookServer_Prompt_Response } from '../../remote-server/socket-types/prompt/PromptbookServer_Prompt_Response';
import type { RemoteClientOptions } from '../../remote-server/types/RemoteClientOptions';
import type { ChatPrompt, CompletionPrompt, EmbeddingPrompt, Prompt } from '../../types/Prompt';
import type { string_markdown, string_markdown_text, string_name, string_title } from '../../types/typeAliases';
import { keepTypeImported } from '../../utils/organization/keepTypeImported';
import type { chococake } from '../../utils/organization/really_any';

/**
 * Profile for Remote provider
 */
const REMOTE_PROVIDER_PROFILE: ChatParticipant = {
    name: 'REMOTE' as string_name,
    fullname: 'Remote Server',
    color: '#6b7280',
} as const;

keepTypeImported<PromptbookServer_ListModels_Request<chococake>>();
keepTypeImported<PromptbookServer_Prompt_Request<chococake>>();

/**
 * Remote server is a proxy server that uses its execution tools internally and exposes the executor interface externally.
 *
 * You can simply use `RemoteExecutionTools` on client-side javascript and connect to your remote server.
 * This is useful to make all logic on browser side but not expose your API keys or no need to use customer's GPU.
 *
 * @see https://github.com/webgptorg/promptbook#remote-server
 * @public exported from `@promptbook/remote-client`
 */
export class RemoteLlmExecutionTools<TCustomOptions = undefined> implements LlmExecutionTools {
    /* <- TODO: [🍚] `, Destroyable` */
    public constructor(protected readonly options: RemoteClientOptions<TCustomOptions>) {}

    public get title(): string_title & string_markdown_text {
        // TODO: [🧠] Maybe fetch title+description from the remote server (as well as if model methods are defined)
        return 'Promptbook remote server';
    }

    public get description(): string_markdown {
        return `Models from Promptbook remote server ${this.options.remoteServerUrl}`;
    }

    public get profile() {
        return REMOTE_PROVIDER_PROFILE;
    }

    /**
     * Check the configuration of all execution tools
     */
    public async checkConfiguration(): Promise<void> {
        const socket = await createRemoteClient(this.options);
        socket.disconnect();

        // TODO: [main] !!3 Check version of the remote server and compatibility
        // TODO: [🎍] Send checkConfiguration
    }

    /**
     * List all available models that can be used
     */
    public async listModels(): Promise<ReadonlyArray<AvailableModel>> {
        // TODO: [👒] Listing models (and checking configuration) probably should go through REST API not Socket.io
        const socket = await createRemoteClient(this.options);

        socket.emit(
            'listModels-request',
            {
                identification: this.options.identification,
            } satisfies PromptbookServer_ListModels_Request<TCustomOptions> /* <- Note: [🤛] */,
        );

        const promptResult = await new Promise<ReadonlyArray<AvailableModel>>((resolve, reject) => {
            socket.on('listModels-response', (response: PromptbookServer_ListModels_Response) => {
                resolve(response.models);
                socket.disconnect();
            });
            socket.on('error', (error: PromptbookServer_Error) => {
                reject(deserializeError(error));
                socket.disconnect();
            });
        });

        socket.disconnect();

        return promptResult;
    }

    /**
     * Calls remote proxy server to use a chat model
     */
    public callChatModel(prompt: ChatPrompt): Promise<ChatPromptResult> {
        if (this.options.isVerbose) {
            console.info(`🖋 Remote callChatModel call`);
        }
        return /* not await */ this.callCommonModel(prompt) as Promise<ChatPromptResult>;
    }

    /**
     * Calls remote proxy server to use a completion model
     */
    public callCompletionModel(prompt: CompletionPrompt): Promise<CompletionPromptResult> {
        if (this.options.isVerbose) {
            console.info(`💬 Remote callCompletionModel call`);
        }
        return /* not await */ this.callCommonModel(prompt) as Promise<CompletionPromptResult>;
    }

    /**
     * Calls remote proxy server to use a embedding model
     */
    public callEmbeddingModel(prompt: EmbeddingPrompt): Promise<EmbeddingPromptResult> {
        if (this.options.isVerbose) {
            console.info(`💬 Remote callEmbeddingModel call`);
        }
        return /* not await */ this.callCommonModel(prompt) as Promise<EmbeddingPromptResult>;
    }

    // <- Note: [🤖] callXxxModel

    /**
     * Calls remote proxy server to use both completion or chat model
     */
    private async callCommonModel(prompt: Prompt): Promise<PromptResult> {
        const socket = await createRemoteClient(this.options);

        socket.emit(
            'prompt-request',
            {
                identification: this.options.identification,
                prompt,
            } satisfies PromptbookServer_Prompt_Request<TCustomOptions> /* <- Note: [🤛] */,
        );

        const promptResult = await new Promise<PromptResult>((resolve, reject) => {
            socket.on('prompt-response', (response: PromptbookServer_Prompt_Response) => {
                resolve(response.promptResult);
                socket.disconnect();
            });
            socket.on('error', (error: PromptbookServer_Error) => {
                reject(deserializeError(error));
                socket.disconnect();
            });
        });

        socket.disconnect();

        return promptResult;
    }
}

/**
 * TODO: Maybe use `$exportJson`
 * TODO: [🧠][🛍] Maybe not `isAnonymous: boolean` BUT `mode: 'ANONYMOUS'|'COLLECTION'`
 * TODO: [🍓] Allow to list compatible models with each variant
 * TODO: [🗯] RemoteLlmExecutionTools should extend Destroyable and implement IDestroyable
 * TODO: [🧠][🌰] Allow to pass `title` for tracking purposes
 * TODO: [🧠] Maybe remove `@promptbook/remote-client` and just use `@promptbook/core`
 */
