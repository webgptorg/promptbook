import { EnvironmentMismatchError } from '../../../../../src/errors/EnvironmentMismatchError';
import { spaceTrim } from '../../../../../src/utils/organization/spaceTrim';
import { normalizeEmailDomain } from '../email/agentEmailAddress';
import { EMAIL_SYSTEM_LOCAL_PARTS } from '../email/emailSystemAddresses';
import { listAgentEmailIdentities } from '../email/listAgentEmailIdentities';
import { readStalwartConfiguration } from './StalwartConfiguration';
import { listStalwartObjects, setStalwartObject } from './stalwartJmapClient';

/**
 * Local part of the single mailbox which receives all agent aliases.
 */
export const STALWART_MAIL_BRIDGE_LOCAL_PART = 'promptbook-mailbridge';

/**
 * Synchronizes one Agents Server domain, bridge mailbox, aliases, and inbound MTA hook.
 */
export async function synchronizeStalwartEmailDomain(domainValue: string): Promise<void> {
    const domain = normalizeEmailDomain(domainValue);
    const configuration = readStalwartConfiguration();

    if (!configuration.isConfigured || !configuration.hookToken || !configuration.smtpPassword) {
        throw new EnvironmentMismatchError(
            spaceTrim(`
                Stalwart email synchronization is not configured.

                Configure the Stalwart API, \`PTBK_STALWART_MTA_HOOK_TOKEN\`, and
                \`PTBK_STALWART_SMTP_PASSWORD\` before synchronizing \`${domain}\`.
            `),
        );
    }

    const domains = await listStalwartObjects(configuration, 'Domain');
    const existingDomain = domains.find((item) => item.name === domain) || null;
    let domainId = readObjectId(existingDomain);
    const bridgeAddress = `${STALWART_MAIL_BRIDGE_LOCAL_PART}@${domain}`;
    const domainValueForStalwart = {
        aliases: [],
        certificateManagement:
            readObjectProperty(existingDomain, 'certificateManagement') || { '@type': 'Manual' },
        dkimManagement: { '@type': 'Automatic' },
        dnsManagement: readObjectProperty(existingDomain, 'dnsManagement') || { '@type': 'Manual' },
        name: domain,
        subAddressing: { '@type': 'Enabled' },
        ...(domainId ? { catchAllAddress: bridgeAddress } : {}),
    };
    domainId = await setStalwartObject(configuration, 'Domain', domainId, domainValueForStalwart);

    const identities = await listAgentEmailIdentities(domain);
    const aliasLocalParts = [
        ...new Set([...EMAIL_SYSTEM_LOCAL_PARTS, ...identities.flatMap((identity) => identity.aliases)]),
    ].filter((localPart) => localPart !== STALWART_MAIL_BRIDGE_LOCAL_PART);
    const accounts = await listStalwartObjects(configuration, 'Account');
    const bridgeAccount =
        accounts.find((item) => item.name === STALWART_MAIL_BRIDGE_LOCAL_PART && item.domainId === domainId) || null;
    await setStalwartObject(configuration, 'Account', readObjectId(bridgeAccount), {
        '@type': 'User',
        name: STALWART_MAIL_BRIDGE_LOCAL_PART,
        domainId,
        credentials: [{ '@type': 'Password', secret: configuration.smtpPassword }],
        memberGroupIds: [],
        roles: { '@type': 'User' },
        permissions: { '@type': 'Inherit' },
        quotas: {},
        aliases: aliasLocalParts.map((name) => ({
            name,
            domainId,
            enabled: true,
        })),
        encryptionAtRest: { '@type': 'Disabled' },
        description: `Agents Server mail bridge for ${domain}`,
    });

    if (!existingDomain) {
        await setStalwartObject(configuration, 'Domain', domainId, {
            catchAllAddress: bridgeAddress,
        });
    }

    const hookUrl = `https://${domain}/api/emails/incoming/stalwart`;
    const hooks = await listStalwartObjects(configuration, 'MtaHook');
    const existingHook = hooks.find((item) => item.url === hookUrl) || null;
    await setStalwartObject(configuration, 'MtaHook', readObjectId(existingHook), {
        url: hookUrl,
        httpAuth: {
            '@type': 'Bearer',
            bearerToken: {
                '@type': 'Value',
                secret: configuration.hookToken,
            },
        },
        httpHeaders: {},
        stages: ['data'],
        tempFailOnError: true,
        timeout: '30s',
        enable: {
            match: [
                {
                    if: `rcpt_domain == '${escapeStalwartExpressionString(domain)}' && authenticated_as == ''`,
                    then: 'true',
                },
            ],
            else: 'false',
        },
    });
}

/**
 * Reads a Stalwart object id from an arbitrary object response.
 */
function readObjectId(value: Readonly<Record<string, unknown>> | null): string | null {
    return typeof value?.id === 'string' ? value.id : null;
}

/**
 * Preserves an administrator-managed nested Stalwart object while synchronizing routing fields.
 */
function readObjectProperty(
    value: Readonly<Record<string, unknown>> | null,
    propertyName: string,
): Readonly<Record<string, unknown>> | null {
    const propertyValue = value?.[propertyName];
    return propertyValue && typeof propertyValue === 'object' && !Array.isArray(propertyValue)
        ? (propertyValue as Readonly<Record<string, unknown>>)
        : null;
}

/**
 * Escapes a value embedded in a single-quoted Stalwart expression string.
 */
function escapeStalwartExpressionString(value: string): string {
    return value.replace(/['\\]/g, '\\$&');
}
