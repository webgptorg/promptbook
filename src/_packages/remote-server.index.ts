// @promptbook/remote-server

import type { RemoteServerOptions } from '../llm-providers/remote/interfaces/RemoteServerOptions';
import { startRemoteServer } from '../llm-providers/remote/startRemoteServer';

// Note: Exporting version from each package
export { PROMPTBOOK_VERSION, RemoteServerOptions, startRemoteServer };
