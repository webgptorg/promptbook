import type { ApplicationRemoteServerOptions, RemoteServerOptions } from '../types/RemoteServerOptions';

/**
 * Normalized configuration shared by remote-server helpers.
 *
 * @private internal utility of `startRemoteServer`
 */
export type StartRemoteServerConfiguration<TCustomOptions> = {
    readonly port: RemoteServerOptions<TCustomOptions>['port'];
    readonly collection: ApplicationRemoteServerOptions<TCustomOptions>['collection'] | null;
    readonly createExecutionTools: RemoteServerOptions<TCustomOptions>['createExecutionTools'];
    readonly createLlmExecutionTools: ApplicationRemoteServerOptions<TCustomOptions>['createLlmExecutionTools'] | null;
    readonly isAnonymousModeAllowed: boolean;
    readonly isApplicationModeAllowed: boolean;
    readonly isRichUi: boolean | undefined;
    readonly isVerbose: boolean;
    readonly login: ApplicationRemoteServerOptions<TCustomOptions>['login'] | null;
    readonly startOptions: RemoteServerOptions<TCustomOptions>;
};

