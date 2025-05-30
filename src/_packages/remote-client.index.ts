// ⚠️ WARNING: This code has been generated so that any manual changes will be overwritten
// `@promptbook/remote-client`

import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../version';
import { compilePipelineOnRemoteServer } from '../conversion/compilePipelineOnRemoteServer';
import { RemoteLlmExecutionTools } from '../llm-providers/remote/RemoteLlmExecutionTools';
import { preparePipelineOnRemoteServer } from '../prepare/preparePipelineOnRemoteServer';
import type { Identification } from '../remote-server/socket-types/_subtypes/Identification';
import type { ApplicationModeIdentification } from '../remote-server/socket-types/_subtypes/Identification';
import type { AnonymousModeIdentification } from '../remote-server/socket-types/_subtypes/Identification';
import type { RemoteClientOptions } from '../remote-server/types/RemoteClientOptions';


// Note: Exporting version from each package
export { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION };


// Note: Entities of the `@promptbook/remote-client`
export { compilePipelineOnRemoteServer };
export { RemoteLlmExecutionTools };
export { preparePipelineOnRemoteServer };
export type { Identification };
export type { ApplicationModeIdentification };
export type { AnonymousModeIdentification };
export type { RemoteClientOptions };
