/**
 * Shared limits and patterns used across default server-search providers.
 *
 * @private function of createDefaultServerSearchProviders
 */
export const defaultServerSearchProviderConfig = {
    federatedAgentsPerServerLimit: 240,
    federatedFetchTimeoutMs: 3200,
    adminLogLimit: 280,
    userChatLimit: 240,
    trailingSlashPattern: /\/+$/,
} as const;
