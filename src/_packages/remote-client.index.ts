// ⚠️ WARNING: This code has been generated so that any manual changes will be overwritten
// `@promptbook/remote-client`

import { compilePipelineOnRemoteServer } from '../conversion/compilePipelineOnRemoteServer';
import { RemoteLlmExecutionTools } from '../llm-providers/remote/RemoteLlmExecutionTools';
import { preparePipelineOnRemoteServer } from '../prepare/preparePipelineOnRemoteServer';
import type {
    AnonymousModeIdentification,
    ApplicationModeIdentification,
    Identification,
} from '../remote-server/socket-types/_subtypes/Identification';
import type { RemoteClientOptions } from '../remote-server/types/RemoteClientOptions';
import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../version';

// Note: Exporting version from each package
export { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION };

// Note: Entities of the `@promptbook/remote-client`
export { compilePipelineOnRemoteServer, preparePipelineOnRemoteServer, RemoteLlmExecutionTools };
export type {
    AnonymousModeIdentification as PromptbookServer_AnonymousIdentification,
    ApplicationModeIdentification as PromptbookServer_ApplicationIdentification,
    Identification as PromptbookServer_Identification,
    RemoteClientOptions,
};
