// ⚠️ WARNING: This code has been generated so that any manual changes will be overwritten
// `@promptbook/remote-server`

import type {
    AnonymousModeIdentification,
    ApplicationModeIdentification,
    Identification,
} from '../remote-server/socket-types/_subtypes/Identification';
import { startRemoteServer } from '../remote-server/startRemoteServer';
import type { RemoteServerOptions } from '../remote-server/types/RemoteServerOptions';
import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../version';

// Note: Exporting version from each package
export { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION };

// Note: Entities of the `@promptbook/remote-server`
export { startRemoteServer };
export type {
    AnonymousModeIdentification as PromptbookServer_AnonymousIdentification,
    ApplicationModeIdentification as PromptbookServer_ApplicationIdentification,
    Identification as PromptbookServer_Identification,
    RemoteServerOptions,
};
