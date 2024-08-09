// `@promptbook/remote-server`
import { PROMPTBOOK_VERSION } from '../version';
import type { RemoteServerOptions } from '../llm-providers/remote/interfaces/RemoteServerOptions';
import { startRemoteServer } from '../llm-providers/remote/startRemoteServer';


// Note: Exporting version from each package
export { PROMPTBOOK_VERSION };


// Note: Entities of the `@promptbook/remote-server`
export type { RemoteServerOptions };
export { startRemoteServer };
