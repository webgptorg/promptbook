import colors from 'colors';
import type http from 'http';
import type { StartRemoteServerConfiguration } from './StartRemoteServerConfiguration';

/**
 * Starts the HTTP server and prints the startup diagnostics.
 *
 * @private internal utility of `startRemoteServer`
 */
export function startListening<TCustomOptions>(
    httpServer: http.Server,
    configuration: StartRemoteServerConfiguration<TCustomOptions>,
): void {
    httpServer.listen(configuration.port);

    // Note: We want to log this also in non-verbose mode
    console.info(colors.bgGreen(`PROMPTBOOK server listening on port ${configuration.port}`));
    if (configuration.isVerbose) {
        console.info(colors.gray(`Verbose mode is enabled`));
    }
}

