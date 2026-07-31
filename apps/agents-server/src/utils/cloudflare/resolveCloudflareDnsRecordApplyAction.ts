import { spaceTrim } from 'spacetrim';
import type { DnsRecordInstruction } from '../dnsRecords/DnsRecordInstruction';
import { normalizeCloudflareDnsRecordName, type CloudflareDnsRecord } from './CloudflareApi';
import { createCloudflareDnsRecordContentPayload } from './createCloudflareDnsRecordRequestBody';
import { normalizeCloudflareDnsRecordContent } from './normalizeCloudflareDnsRecordContent';

/**
 * DNS record types which hold exactly one value per hostname, so an existing record may be overwritten safely.
 */
const SINGLE_VALUE_DNS_RECORD_TYPES: ReadonlySet<string> = new Set(['A', 'AAAA', 'CNAME']);

/**
 * Version tag which starts a policy `TXT` record, for example `v=spf1 mx -all` or `v=DMARC1; p=quarantine`.
 */
const DNS_TEXT_RECORD_POLICY_TAG_PATTERN = /^v=([a-z0-9]+)/i;

/**
 * What the Cloudflare DNS wizard does with one DNS record of the manual.
 */
export type CloudflareDnsRecordApplyAction =
    | {
          /**
           * The record is missing in Cloudflare and will be created.
           */
          readonly kind: 'create';
      }
    | {
          /**
           * An existing Cloudflare record holds the same role and will be overwritten.
           */
          readonly kind: 'update';

          /**
           * Cloudflare id of the overwritten record.
           */
          readonly recordId: string;
      }
    | {
          /**
           * Cloudflare already contains exactly this record.
           */
          readonly kind: 'unchanged';
      }
    | {
          /**
           * The record cannot be written without a human decision.
           */
          readonly kind: 'skip';

          /**
           * Explanation shown in the wizard.
           */
          readonly reason: string;
      };

/**
 * Resolves what has to be done in Cloudflare so that one DNS record of the manual is configured.
 *
 * Conflicting records are never deleted, because one Cloudflare zone can also contain records of unrelated services.
 *
 * @param record - DNS record shown in the DNS manual.
 * @param existingZoneRecords - Records which currently exist in the matching Cloudflare zone.
 * @returns Action which configures the record.
 */
export function resolveCloudflareDnsRecordApplyAction(
    record: DnsRecordInstruction,
    existingZoneRecords: ReadonlyArray<CloudflareDnsRecord>,
): CloudflareDnsRecordApplyAction {
    const matchingRecords = existingZoneRecords.filter(
        (existingRecord) =>
            existingRecord.type.toUpperCase() === record.type.toUpperCase() &&
            normalizeCloudflareDnsRecordName(existingRecord.name) === normalizeCloudflareDnsRecordName(record.name),
    );

    if (matchingRecords.some((existingRecord) => isCloudflareDnsRecordAlreadyConfigured(existingRecord, record))) {
        return { kind: 'unchanged' };
    }

    if (matchingRecords.length === 0) {
        return { kind: 'create' };
    }

    const overwritableRecord = matchingRecords.length === 1 ? matchingRecords[0] : undefined;

    if (overwritableRecord && isOverwritableCloudflareDnsRecord(overwritableRecord, record)) {
        return { kind: 'update', recordId: overwritableRecord.id };
    }

    return {
        kind: 'skip',
        reason: spaceTrim(`
            Cloudflare already has a different \`${record.type}\` record for \`${record.name}\`.
            **Remove the conflicting record in Cloudflare** and import again.
        `),
    };
}

/**
 * Checks whether one existing Cloudflare record already holds the value from the DNS manual.
 *
 * @param existingRecord - Record which currently exists in Cloudflare.
 * @param record - DNS record shown in the DNS manual.
 * @returns `true` when nothing has to be written.
 */
function isCloudflareDnsRecordAlreadyConfigured(
    existingRecord: CloudflareDnsRecord,
    record: DnsRecordInstruction,
): boolean {
    const contentPayload = createCloudflareDnsRecordContentPayload(record.type, record.value);

    if (contentPayload.priority !== undefined && (existingRecord.priority ?? null) !== contentPayload.priority) {
        return false;
    }

    return (
        normalizeCloudflareDnsRecordContent(record.type, existingRecord.content) ===
        normalizeCloudflareDnsRecordContent(record.type, contentPayload.content ?? record.value)
    );
}

/**
 * Checks whether one existing Cloudflare record holds the same role as the record from the DNS manual.
 *
 * @param existingRecord - Record which currently exists in Cloudflare.
 * @param record - DNS record shown in the DNS manual.
 * @returns `true` when the existing record may be overwritten.
 */
function isOverwritableCloudflareDnsRecord(existingRecord: CloudflareDnsRecord, record: DnsRecordInstruction): boolean {
    const normalizedType = record.type.toUpperCase();

    if (SINGLE_VALUE_DNS_RECORD_TYPES.has(normalizedType)) {
        return true;
    }

    if (normalizedType !== 'TXT') {
        return false;
    }

    // Note: One hostname can hold many unrelated `TXT` records, but only one record of each policy, for example
    //       only one SPF policy is valid for a domain.
    const existingPolicyTag = extractDnsTextRecordPolicyTag(existingRecord.content);

    return existingPolicyTag !== null && existingPolicyTag === extractDnsTextRecordPolicyTag(record.value);
}

/**
 * Extracts the policy version tag of one `TXT` record.
 *
 * @param content - Raw `TXT` record content.
 * @returns Lowercased policy tag like `spf1` or `null` when the record is not a policy.
 */
function extractDnsTextRecordPolicyTag(content: string): string | null {
    const unquotedContent = content.trim().replace(/^"(.*)"$/s, '$1');
    const policyTagMatch = DNS_TEXT_RECORD_POLICY_TAG_PATTERN.exec(unquotedContent);

    return policyTagMatch ? (policyTagMatch[1] || '').toLowerCase() : null;
}
