import colors from 'colors';
import {
    CLOUDFLARE_DNS_RECORD_COMMENT_MARKER,
    normalizeCloudflareDnsRecordContent,
    type CloudflareDnsRecordSyncPlan,
    type CloudflareDnsRecordUpdate,
    type DesiredCloudflareDnsRecord,
} from './createCloudflareDnsRecordSyncPlan';
import {
    normalizeVercelDomainBinding,
    type DesiredVercelProjectDomain,
    type VercelDomainReconfiguration,
    type VercelDomainSyncPlan,
    type VercelProjectMetadata,
} from './createVercelDomainSyncPlan';

/**
 * Human-readable report section shown after one sync run in interactive terminals.
 */
type HumanReadableReportSection = {
    /**
     * Stable section key.
     */
    readonly key: string;
    /**
     * Optional short explanation shown under the section title.
     */
    readonly description?: string;
    /**
     * Colorized section title suffix.
     */
    readonly label: string;
    /**
     * Colorized item prefix.
     */
    readonly bullet: string;
    /**
     * Lines rendered under the section.
     */
    readonly lines: ReadonlyArray<string>;
};

/**
 * Prints a colorized human-readable summary for interactive terminal runs.
 *
 * @param options - Sync execution options and computed plans.
 *
 * @private function of `sync-vercel-domains`
 */
export function printHumanReadableSyncReport(options: {
    readonly dryRun: boolean;
    readonly deleteRemoved: boolean;
    readonly projectMetadata: VercelProjectMetadata;
    readonly syncPlan: VercelDomainSyncPlan;
    readonly cloudflareSyncPlan: CloudflareDnsRecordSyncPlan | null;
    readonly cloudflareSyncSkippedReason: string | null;
}): void {
    if (!isHumanReadableSyncReportEnabled()) {
        return;
    }

    const summaryLabel = options.dryRun ? 'planned changes' : 'applied changes';
    const reportSections = createHumanReadableReportSections(options.syncPlan, options, {
        cloudflareSyncPlan: options.cloudflareSyncPlan,
        cloudflareSyncSkippedReason: options.cloudflareSyncSkippedReason,
    });
    const totalChangedDomains =
        options.syncPlan.domainsToAdd.length +
        options.syncPlan.domainsToVerify.length +
        options.syncPlan.domainsToReconfigure.length +
        (options.deleteRemoved ? options.syncPlan.domainsToFlag.length : 0);

    console.log('');
    console.log(colors.cyan.bold('━━━━━━━━━━ Vercel domain sync report ━━━━━━━━━━'));
    console.log(
        [
            `${colors.bold('Mode:')} ${options.dryRun ? colors.yellow.bold('DRY RUN') : colors.green.bold('LIVE')}`,
            `${colors.bold('Summary:')} ${colors.white.bold(String(totalChangedDomains))} ${summaryLabel}`,
            `${colors.bold('Desired domains:')} ${colors.white(String(options.syncPlan.desiredDomains.length))}`,
        ].join(` ${colors.gray('•')} `),
    );
    console.log(
        [
            `${colors.bold('Production branch:')} ${formatHumanReadableNullableValue(
                options.projectMetadata.productionBranch,
            )}`,
            `${colors.bold('Custom environments:')} ${colors.white(
                String(options.projectMetadata.customEnvironments.length),
            )}`,
            `${colors.bold('Delete removed:')} ${options.deleteRemoved ? colors.red('yes') : colors.gray('no')}`,
        ].join(` ${colors.gray('•')} `),
    );

    if (reportSections.length === 0) {
        console.log(colors.green('✓ No domain changes were necessary.'));
        if (options.syncPlan.ignoredDomains.length > 0) {
            console.log(colors.gray(`○ Ignored ${options.syncPlan.ignoredDomains.length} Vercel-managed domain(s).`));
        }
        console.log(colors.cyan.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        return;
    }

    for (const section of reportSections) {
        console.log('');
        console.log(`${section.bullet} ${section.label}`);
        if (section.description) {
            console.log(`  ${colors.gray(section.description)}`);
        }
        for (const line of section.lines) {
            console.log(`  ${colors.gray('•')} ${line}`);
        }
    }

    console.log('');
    console.log(colors.cyan.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
}

/**
 * Creates itemized human-readable report sections for one sync plan.
 *
 * @param syncPlan - Computed sync plan.
 * @param options - Sync execution options.
 * @param cloudflareOptions - Cloudflare planning/reporting information.
 * @returns Ordered report sections.
 */
function createHumanReadableReportSections(
    syncPlan: VercelDomainSyncPlan,
    options: {
        readonly dryRun: boolean;
        readonly deleteRemoved: boolean;
    },
    cloudflareOptions: {
        readonly cloudflareSyncPlan: CloudflareDnsRecordSyncPlan | null;
        readonly cloudflareSyncSkippedReason: string | null;
    },
): Array<HumanReadableReportSection> {
    const sections: Array<HumanReadableReportSection> = [];

    if (syncPlan.domainsToAdd.length > 0) {
        sections.push({
            key: 'add',
            label: colors.green.bold(options.dryRun ? 'Domains to add' : 'Domains added'),
            bullet: colors.green(options.dryRun ? '+' : '✓'),
            lines: syncPlan.domainsToAdd.map((domain) =>
                formatDesiredDomainReportLine(domain, {
                    includeEnvironmentLabel: true,
                }),
            ),
        });
    }

    if (syncPlan.domainsToReconfigure.length > 0) {
        sections.push({
            key: 'reconfigure',
            label: colors.yellow.bold(options.dryRun ? 'Domains to reconfigure' : 'Domains reconfigured'),
            bullet: colors.yellow('↺'),
            lines: syncPlan.domainsToReconfigure.map((reconfiguration) =>
                formatDomainReconfigurationReportLine(reconfiguration),
            ),
        });
    }

    if (syncPlan.domainsToVerify.length > 0) {
        sections.push({
            key: 'verify',
            label: colors.blue.bold(options.dryRun ? 'Domains to verify' : 'Domains verified'),
            bullet: colors.blue('✓'),
            lines: syncPlan.domainsToVerify.map((domain) => colors.white.bold(domain)),
        });
    }

    if (syncPlan.domainsToFlag.length > 0) {
        sections.push({
            key: options.deleteRemoved ? 'delete' : 'flag',
            label: options.deleteRemoved
                ? colors.red.bold(options.dryRun ? 'Domains to delete' : 'Domains deleted')
                : colors.red.bold('Domains flagged for removal'),
            description: options.deleteRemoved
                ? undefined
                : 'These domains still exist on Vercel but are no longer present in `_Server`. Re-run with `--delete-removed` to remove them.',
            bullet: colors.red(options.deleteRemoved ? '-' : '!'),
            lines: syncPlan.domainsToFlag.map((domain) => colors.white.bold(domain)),
        });
    }

    if (syncPlan.ignoredDomains.length > 0) {
        sections.push({
            key: 'ignored',
            label: colors.gray.bold('Ignored Vercel-managed domains'),
            bullet: colors.gray('○'),
            lines: syncPlan.ignoredDomains.map((domain) => colors.gray(domain)),
        });
    }

    if (cloudflareOptions.cloudflareSyncPlan) {
        if (cloudflareOptions.cloudflareSyncPlan.recordsToCreate.length > 0) {
            sections.push({
                key: 'cloudflare-create',
                label: colors.blue.bold(options.dryRun ? 'Cloudflare records to create' : 'Cloudflare records created'),
                bullet: colors.blue(options.dryRun ? '+' : '✓'),
                description:
                    'Cloudflare changes are create/update only. Unrelated DNS records in the same zone are intentionally left untouched.',
                lines: cloudflareOptions.cloudflareSyncPlan.recordsToCreate.map((record) =>
                    formatCloudflareDesiredRecordReportLine(record),
                ),
            });
        }

        if (cloudflareOptions.cloudflareSyncPlan.recordsToUpdate.length > 0) {
            sections.push({
                key: 'cloudflare-update',
                label: colors.blue.bold(options.dryRun ? 'Cloudflare records to update' : 'Cloudflare records updated'),
                bullet: colors.blue('↺'),
                description: `Updated records are marked with comment ${CLOUDFLARE_DNS_RECORD_COMMENT_MARKER}.`,
                lines: cloudflareOptions.cloudflareSyncPlan.recordsToUpdate.map((update) =>
                    formatCloudflareRecordUpdateReportLine(update),
                ),
            });
        }

        if (cloudflareOptions.cloudflareSyncPlan.skippedDomains.length > 0) {
            sections.push({
                key: 'cloudflare-skip',
                label: colors.yellow.bold('Cloudflare domains skipped'),
                bullet: colors.yellow('!'),
                description:
                    'Skipped domains were not changed because the zone/record state looked unsafe or unsupported for automatic DNS updates.',
                lines: cloudflareOptions.cloudflareSyncPlan.skippedDomains.map(
                    (skippedDomain) =>
                        `${colors.white.bold(skippedDomain.domain)} ${colors.gray(`(${skippedDomain.reason})`)}`,
                ),
            });
        }
    } else if (cloudflareOptions.cloudflareSyncSkippedReason) {
        sections.push({
            key: 'cloudflare-disabled',
            label: colors.gray.bold('Cloudflare sync skipped'),
            bullet: colors.gray('○'),
            lines: [colors.gray(cloudflareOptions.cloudflareSyncSkippedReason)],
        });
    }

    return sections;
}

/**
 * Formats one desired Cloudflare DNS record for the human-readable report.
 *
 * @param record - Desired Cloudflare DNS record.
 * @returns Colorized report line.
 */
function formatCloudflareDesiredRecordReportLine(record: DesiredCloudflareDnsRecord): string {
    return [
        colors.white.bold(record.name),
        colors.gray(`(${record.zoneName})`),
        colors.cyan(record.type),
        colors.gray('→'),
        colors.white(record.content),
        colors.gray(
            `proxied=${record.proxied ? 'true' : 'false'}, ttl=${record.ttl === 1 ? 'auto' : String(record.ttl)}`,
        ),
    ].join(' ');
}

/**
 * Formats one Cloudflare DNS record update for the human-readable report.
 *
 * @param update - Existing/desired Cloudflare DNS record pair.
 * @returns Colorized report line.
 */
function formatCloudflareRecordUpdateReportLine(update: CloudflareDnsRecordUpdate): string {
    return [
        colors.white.bold(update.desiredRecord.name),
        colors.gray(`(${update.desiredRecord.zoneName})`),
        colors.cyan(update.desiredRecord.type),
        colors.gray(
            `${normalizeCloudflareDnsRecordContent(
                update.currentRecord.type,
                update.currentRecord.content,
            )} ${colors.yellow('→')} ${update.desiredRecord.content}`,
        ),
        colors.yellow(`[${update.reasons.join('; ')}]`),
    ].join(' ');
}

/**
 * Formats one desired domain binding for the human-readable report.
 *
 * @param domain - Desired domain binding.
 * @param options - Formatting options.
 * @returns Colorized report line.
 */
function formatDesiredDomainReportLine(
    domain: DesiredVercelProjectDomain,
    options: {
        readonly includeEnvironmentLabel: boolean;
    },
): string {
    const parts = [colors.white.bold(domain.name)];

    if (options.includeEnvironmentLabel) {
        parts.push(colors.gray(`← ${domain.sourceEnvironment}`));
    }

    parts.push(colors.cyan(domain.vercelEnvironmentName));

    const bindingDetails: Array<string> = [];
    if (domain.gitBranch) {
        bindingDetails.push(`branch ${colors.yellow(domain.gitBranch)}`);
    }
    if (domain.customEnvironmentId) {
        bindingDetails.push(`custom env ${colors.magenta(domain.customEnvironmentId)}`);
    }

    if (bindingDetails.length > 0) {
        parts.push(colors.gray(`(${bindingDetails.join(', ')})`));
    }

    return parts.join(' ');
}

/**
 * Formats one domain reconfiguration item for the human-readable report.
 *
 * @param reconfiguration - Domain reconfiguration details.
 * @returns Colorized report line.
 */
function formatDomainReconfigurationReportLine(reconfiguration: VercelDomainReconfiguration): string {
    const currentBinding = normalizeVercelDomainBinding(reconfiguration.currentDomain);
    const desiredBinding = normalizeVercelDomainBinding(reconfiguration.desiredDomain);

    return [
        colors.white.bold(reconfiguration.desiredDomain.name),
        colors.gray(
            `(${reconfiguration.desiredDomain.sourceEnvironment} → ${reconfiguration.desiredDomain.vercelEnvironmentName})`,
        ),
        colors.gray(
            `${formatHumanReadableBinding(currentBinding)} ${colors.yellow('→')} ${formatHumanReadableBinding(
                desiredBinding,
            )}`,
        ),
        colors.yellow(`[${reconfiguration.reasons.join('; ')}]`),
    ].join(' ');
}

/**
 * Formats one normalized domain binding for the human-readable report.
 *
 * @param binding - Normalized branch/custom-environment binding.
 * @returns Colorized binding label.
 */
function formatHumanReadableBinding(binding: {
    readonly gitBranch: string | null;
    readonly customEnvironmentId: string | null;
}): string {
    const bindingParts: Array<string> = [];

    if (binding.gitBranch !== null) {
        bindingParts.push(`branch ${colors.yellow(binding.gitBranch)}`);
    }

    if (binding.customEnvironmentId !== null) {
        bindingParts.push(`env ${colors.magenta(binding.customEnvironmentId)}`);
    }

    if (bindingParts.length === 0) {
        return colors.gray('<default>');
    }

    return bindingParts.join(', ');
}

/**
 * Formats one nullable summary value for the human-readable report.
 *
 * @param value - Raw summary value.
 * @returns Colorized value.
 */
function formatHumanReadableNullableValue(value: string | null | undefined): string {
    return value ? colors.white(value) : colors.gray('<none>');
}

/**
 * Detects whether the human-readable sync report should be printed.
 *
 * @returns `true` when interactive color output is expected.
 */
function isHumanReadableSyncReportEnabled(): boolean {
    if (process.env.PROMPTBOOK_SYNC_VERCEL_DOMAINS_HUMAN_REPORT === 'false') {
        return false;
    }

    return Boolean(process.stdout.isTTY || process.env.FORCE_COLOR);
}
