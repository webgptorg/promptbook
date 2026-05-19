import { DEFAULT_IS_VERBOSE } from '../../config';
import type { RemoteServerOptions } from '../types/RemoteServerOptions';
import type { StartRemoteServerConfiguration } from './StartRemoteServerConfiguration';

/**
 * Resolves option defaults once so the rest of the remote-server flow can work with a single shape.
 *
 * @private internal utility of `startRemoteServer`
 */
export function resolveStartRemoteServerConfiguration<TCustomOptions>(
    startOptions: RemoteServerOptions<TCustomOptions>,
): StartRemoteServerConfiguration<TCustomOptions> {
    const {
        port,
        collection,
        createLlmExecutionTools,
        createExecutionTools,
        isAnonymousModeAllowed,
        isApplicationModeAllowed,
        isRichUi,
        isVerbose = DEFAULT_IS_VERBOSE,
        login,
    } = {
        isAnonymousModeAllowed: false,
        isApplicationModeAllowed: false,
        collection: null,
        createLlmExecutionTools: null,
        login: null,
        ...startOptions,
    };

    return {
        port,
        collection,
        createExecutionTools,
        createLlmExecutionTools,
        isAnonymousModeAllowed,
        isApplicationModeAllowed,
        isRichUi,
        isVerbose,
        login,
        startOptions,
    };
}

