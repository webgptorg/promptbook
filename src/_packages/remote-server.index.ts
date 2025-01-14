// ⚠️ WARNING: This code has been generated so that any manual changes will be overwritten
// `@promptbook/remote-server`

import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../version';
import type { PromptbookServer_Identification } from '../remote-server/socket-types/_subtypes/PromptbookServer_Identification';
import type { PromptbookServer_ApplicationIdentification } from '../remote-server/socket-types/_subtypes/PromptbookServer_Identification';
import type { PromptbookServer_AnonymousIdentification } from '../remote-server/socket-types/_subtypes/PromptbookServer_Identification';
import { startRemoteServer } from '../remote-server/startRemoteServer';
import type { RemoteServerOptions } from '../remote-server/types/RemoteServerOptions';


// Note: Exporting version from each package
export { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION };


// Note: Entities of the `@promptbook/remote-server`
export type { PromptbookServer_Identification };
export type { PromptbookServer_ApplicationIdentification };
export type { PromptbookServer_AnonymousIdentification };
export { startRemoteServer };
export type { RemoteServerOptions };
