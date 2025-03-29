// ⚠️ WARNING: This code has been generated so that any manual changes will be overwritten
// `@promptbook/remote-server`

import { startRemoteServer } from '../remote-server/RemoteServer';
import type {
    PromptbookServer_AnonymousIdentification,
    PromptbookServer_ApplicationIdentification,
    PromptbookServer_Identification,
} from '../remote-server/socket-types/_subtypes/PromptbookServer_Identification';
import type { RemoteServerOptions } from '../remote-server/types/RemoteServerOptions';
import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../version';

// Note: Exporting version from each package
export { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION };

// Note: Entities of the `@promptbook/remote-server`
export { startRemoteServer };
export type {
    PromptbookServer_AnonymousIdentification,
    PromptbookServer_ApplicationIdentification,
    PromptbookServer_Identification,
    RemoteServerOptions,
};
