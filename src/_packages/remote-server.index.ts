// ⚠️ WARNING: This code has been generated so that any manual changes will be overwritten
// `@promptbook/remote-server`

import { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION } from '../version';
import type { Identification } from '../remote-server/socket-types/_subtypes/Identification';
import type { ApplicationModeIdentification } from '../remote-server/socket-types/_subtypes/Identification';
import type { AnonymousModeIdentification } from '../remote-server/socket-types/_subtypes/Identification';
import { startAgentServer } from '../remote-server/startAgentServer';
import { startRemoteServer } from '../remote-server/startRemoteServer';
import type { RemoteServerOptions } from '../remote-server/types/RemoteServerOptions';


// Note: Exporting version from each package
export { BOOK_LANGUAGE_VERSION, PROMPTBOOK_ENGINE_VERSION };


// Note: Entities of the `@promptbook/remote-server`
export type { Identification };
export type { ApplicationModeIdentification };
export type { AnonymousModeIdentification };
export { startAgentServer };
export { startRemoteServer };
export type { RemoteServerOptions };
