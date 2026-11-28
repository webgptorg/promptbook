import { spaceTrim } from 'spacetrim';
import { NotFoundError } from '../../../../../src/errors/NotFoundError';
import type { DnsRecordInstruction } from '../dnsRecords/DnsRecordInstruction';
import {
    CLOUDFLARE_DNS_RECORD_PROXIED,
    CLOUDFLARE_DNS_RECORD_TTL_AUTOMATIC,
    type CloudflareApiConfiguration,
    type CloudflareDnsRecord,
} from './CloudflareApi';
import type { CloudflareDnsBatchApplication, CloudflareDnsBatchRecordResult } from './CloudflareDnsBatchApplication';
import { createCloudflareDnsRecord } from './createCloudflareDnsRecord';
import { findBestMatchingCloudflareZoneForDomain } from './findBestMatchingCloudflareZoneForDomain';
import { listAllCloudflareDnsRecords } from './listAllCloudflareDnsRecords';
import { listCloudflareZones } from './listCloudflareZones';
import { resolveCloudflareDnsRecordApplyAction } from './resolveCloudflareDnsRecordApplyAction';
import { updateCloudflareDnsRecord } from './updateCloudflareDnsRecord';

/**
 * Comment written on every DNS record which the Cloudflare DNS wizard creates or overwrites.
 */
const CLOUDFLARE_DNS_WIZARD_RECORD_COMMENT = 'Managed by the Promptbook Agents Server DNS wizard';

/**
 * Writes all DNS records of one manual into the matching Cloudflare zone at once.
 *
 * @param options - Cloudflare API token, configured domain, and the records of the DNS manual.
 * @returns Result of every record.
 */
export async function applyCloudflareDnsRecordInstructions(options: {
    readonly apiToken: string;
    readonly domain: string;
    readonly records: ReadonlyArray<DnsRecordInstruction>;
}): Promise<CloudflareDnsBatchApplication> {
    const configuration: CloudflareApiConfiguration = { token: options.apiToken };
    const zones = await listCloudflareZones(configuration);
    const zone = findBestMatchingCloudflareZoneForDomain(options.domain, zones);

    if (!zone) {
        throw new NotFoundError(
            spaceTrim(`
                No Cloudflare zone available to this API token contains \`${options.domain}\`.

                Available zones: ${zones.map((availableZone) => `\`${availableZone.name}\``).join(', ') || '*(none)*'}

                **Add the domain to Cloudflare** or use an API token with \`Zone.DNS\` access to its zone.
            `),
        );
    }

    const existingZoneRecords = await listAllCloudflareDnsRecords(configuration, zone.id);
    const results: Array<CloudflareDnsBatchRecordResult> = [];

    for (const record of options.records) {
        results.push(
            await applyCloudflareDnsRecordInstruction({
                configuration,
                zoneId: zone.id,
                record,
                existingZoneRecords,
            }),
        );
    }

    return { zoneName: zone.name, results };
}

/**
 * Writes one DNS record of the manual into Cloudflare.
 *
 * @param options - Cloudflare access, target zone, and the record to configure.
 * @returns Result of the record.
 *
 * @private function of `applyCloudflareDnsRecordInstructions`
 */
async function applyCloudflareDnsRecordInstruction(options: {
    readonly configuration: CloudflareApiConfiguration;
    readonly zoneId: string;
    readonly record: DnsRecordInstruction;
    readonly existingZoneRecords: ReadonlyArray<CloudflareDnsRecord>;
}): Promise<CloudflareDnsBatchRecordResult> {
    const { configuration, zoneId, record, existingZoneRecords } = options;
    const action = resolveCloudflareDnsRecordApplyAction(record, existingZoneRecords);
    const writeInput = {
        zoneId,
        type: record.type,
        name: record.name,
        content: record.value,
        proxied: CLOUDFLARE_DNS_RECORD_PROXIED,
        ttl: CLOUDFLARE_DNS_RECORD_TTL_AUTOMATIC,
        comment: CLOUDFLARE_DNS_WIZARD_RECORD_COMMENT,
    };

    try {
        if (action.kind === 'unchanged') {
            return createCloudflareDnsBatchRecordResult(record, 'unchanged', 'Already configured in Cloudflare.');
        }

        if (action.kind === 'skip') {
            return createCloudflareDnsBatchRecordResult(record, 'skipped', action.reason);
        }

        if (action.kind === 'update') {
            await updateCloudflareDnsRecord(configuration, { ...writeInput, recordId: action.recordId });

            return createCloudflareDnsBatchRecordResult(record, 'updated', 'Existing Cloudflare record was updated.');
        }

        await createCloudflareDnsRecord(configuration, writeInput);

        return createCloudflareDnsBatchRecordResult(record, 'created', 'Added to Cloudflare as DNS only.');
    } catch (error) {
        return createCloudflareDnsBatchRecordResult(
            record,
            'failed',
            error instanceof Error ? error.message : 'Cloudflare rejected this record.',
        );
    }
}

/**
 * Creates one browser-safe record result.
 *
 * @param record - DNS record shown in the DNS manual.
 * @param status - What happened with the record.
 * @param message - Human-readable explanation.
 * @returns Record result rendered by the wizard.
 *
 * @private function of `applyCloudflareDnsRecordInstructions`
 */
function createCloudflareDnsBatchRecordResult(
    record: DnsRecordInstruction,
    status: CloudflareDnsBatchRecordResult['status'],
    message: string,
): CloudflareDnsBatchRecordResult {
    return {
        type: record.type,
        name: record.name,
        value: record.value,
        status,
        message,
    };
}
