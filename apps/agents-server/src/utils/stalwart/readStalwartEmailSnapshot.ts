import { normalizeEmailDomain } from '../email/agentEmailAddress';
import { listAgentEmailIdentities, type AgentEmailIdentity } from '../email/listAgentEmailIdentities';
import { readStalwartConfiguration } from './StalwartConfiguration';
import { listStalwartObjects } from './stalwartJmapClient';

/**
 * Read-only operational state shown on Stalwart administration pages.
 */
export type StalwartEmailSnapshot = {
    readonly checkedAt: string;
    readonly apiUrl: string;
    readonly isConfigured: boolean;
    readonly isReachable: boolean;
    readonly errorMessage: string | null;
    readonly domain: string;
    readonly domainId: string | null;
    readonly dnsZoneFile: string | null;
    readonly isBridgeAccountConfigured: boolean;
    readonly isInboundHookConfigured: boolean;
    readonly agents: ReadonlyArray<AgentEmailIdentity>;
};

/**
 * Determines whether every required part of the current server's agent email integration is operational.
 *
 * @param snapshot - Current Stalwart configuration and health snapshot.
 * @returns `true` when the agent email service can receive and route mail for this server.
 *
 * @private shared by Stalwart administration and Header warnings
 */
export function isStalwartEmailSnapshotOperational(
    snapshot: Pick<
        StalwartEmailSnapshot,
        'isReachable' | 'domainId' | 'isBridgeAccountConfigured' | 'isInboundHookConfigured'
    >,
): boolean {
    return Boolean(
        snapshot.isReachable &&
            snapshot.domainId &&
            snapshot.isBridgeAccountConfigured &&
            snapshot.isInboundHookConfigured,
    );
}

/**
 * Reads Stalwart state for one server domain without throwing on an unavailable service.
 */
export async function readStalwartEmailSnapshot(domainValue: string): Promise<StalwartEmailSnapshot> {
    const domain = normalizeEmailDomain(domainValue);
    const configuration = readStalwartConfiguration();
    const agents = await listAgentEmailIdentities(domain);
    const baseSnapshot = {
        checkedAt: new Date().toISOString(),
        apiUrl: configuration.apiUrl,
        isConfigured: configuration.isConfigured,
        domain,
        agents,
    };

    if (!configuration.isConfigured) {
        return {
            ...baseSnapshot,
            isReachable: false,
            errorMessage: 'Stalwart credentials and bridge secrets are not fully configured.',
            domainId: null,
            dnsZoneFile: null,
            isBridgeAccountConfigured: false,
            isInboundHookConfigured: false,
        };
    }

    try {
        const [domains, accounts, hooks] = await Promise.all([
            listStalwartObjects(configuration, 'Domain'),
            listStalwartObjects(configuration, 'Account'),
            listStalwartObjects(configuration, 'MtaHook'),
        ]);
        const domainObject = domains.find((item) => item.name === domain) || null;
        const domainId = typeof domainObject?.id === 'string' ? domainObject.id : null;
        const hookUrl = `https://${domain}/api/emails/incoming/stalwart`;

        return {
            ...baseSnapshot,
            isReachable: true,
            errorMessage: null,
            domainId,
            dnsZoneFile: typeof domainObject?.dnsZoneFile === 'string' ? domainObject.dnsZoneFile : null,
            isBridgeAccountConfigured: accounts.some(
                (item) => item.name === 'promptbook-mailbridge' && item.domainId === domainId,
            ),
            isInboundHookConfigured: hooks.some((item) => item.url === hookUrl),
        };
    } catch (error) {
        return {
            ...baseSnapshot,
            isReachable: false,
            errorMessage: error instanceof Error ? error.message : String(error),
            domainId: null,
            dnsZoneFile: null,
            isBridgeAccountConfigured: false,
            isInboundHookConfigured: false,
        };
    }
}
