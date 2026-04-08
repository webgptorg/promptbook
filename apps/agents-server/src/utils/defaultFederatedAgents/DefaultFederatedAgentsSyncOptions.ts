/**
 * Minimal context needed to schedule or execute one default federated-agent sync pass.
 *
 * @private shared type for `scheduleDefaultFederatedAgentsSync`
 */
export type DefaultFederatedAgentsSyncOptions = {
    readonly tablePrefix: string;
    readonly localServerUrl: string;
};
