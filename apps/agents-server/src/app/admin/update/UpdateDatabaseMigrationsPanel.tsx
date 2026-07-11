'use client';

import type {
    UpdateDatabaseMigrationPrefixSummary,
    UpdateDatabaseMigrationSnapshot,
    UpdateDatabaseMigrationStatus,
} from './UpdateOverview';

/**
 * Props for the self-update database migrations panel.
 *
 * @private type of `<UpdateDatabaseMigrationsPanel/>`
 */
type UpdateDatabaseMigrationsPanelProps = {
    readonly databaseMigrations: UpdateDatabaseMigrationSnapshot | null;
    readonly isJobIdle: boolean;
};

/**
 * Props for one database migration metric.
 *
 * @private type of `<UpdateDatabaseMigrationsPanel/>`
 */
type DatabaseMigrationMetricProps = {
    readonly label: string;
    readonly value: string;
};

/**
 * Renders database migration status recorded during the latest self-update job.
 *
 * @private internal component of `<UpdateJobCard/>`
 */
export function UpdateDatabaseMigrationsPanel({
    databaseMigrations,
    isJobIdle,
}: UpdateDatabaseMigrationsPanelProps) {
    const status = databaseMigrations?.status ?? 'pending';
    const appliedCount = getAppliedDatabaseMigrationCount(databaseMigrations);
    const processedPrefixCount = getProcessedDatabaseMigrationPrefixCount(databaseMigrations);

    return (
        <section className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900">Database migrations</h3>
                    <p className="mt-1 text-sm text-slate-600">
                        {formatDatabaseMigrationStatusMessage(databaseMigrations, isJobIdle)}
                    </p>
                </div>
                <DatabaseMigrationStatusBadge status={status} />
            </div>

            <dl className="mt-4 grid min-w-0 gap-3 text-sm text-slate-600 md:grid-cols-3">
                <DatabaseMigrationMetric
                    label="Applied"
                    value={appliedCount === null ? 'Not recorded' : String(appliedCount)}
                />
                <DatabaseMigrationMetric
                    label="Prefixes"
                    value={processedPrefixCount === null ? 'Not recorded' : String(processedPrefixCount)}
                />
                <DatabaseMigrationMetric
                    label="Migration files"
                    value={
                        databaseMigrations === null || databaseMigrations.totalMigrationFiles === null
                            ? 'Not recorded'
                            : String(databaseMigrations.totalMigrationFiles)
                    }
                />
            </dl>

            {databaseMigrations?.summaryFilePath && (
                <div className="mt-3 text-xs text-slate-500">
                    Migration summary:
                    <span className="ml-2 break-all font-mono text-slate-700">
                        {databaseMigrations.summaryFilePath}
                    </span>
                </div>
            )}

            {databaseMigrations && databaseMigrations.perPrefix.length > 0 && (
                <div className="mt-4 space-y-2">
                    {databaseMigrations.perPrefix.map((prefixSummary, index) => (
                        <DatabaseMigrationPrefixSummaryRow
                            key={`${prefixSummary.prefix}:${index}`}
                            prefixSummary={prefixSummary}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

/**
 * Renders one database migration metric.
 *
 * @private internal component of `<UpdateDatabaseMigrationsPanel/>`
 */
function DatabaseMigrationMetric({ label, value }: DatabaseMigrationMetricProps) {
    return (
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-1 break-words text-slate-900">{value}</dd>
        </div>
    );
}

/**
 * Renders one prefix row inside the database migration panel.
 *
 * @private internal component of `<UpdateDatabaseMigrationsPanel/>`
 */
function DatabaseMigrationPrefixSummaryRow({
    prefixSummary,
}: {
    readonly prefixSummary: UpdateDatabaseMigrationPrefixSummary;
}) {
    const isAppliedMigrationFileListVisible = prefixSummary.appliedMigrationFiles.length > 0;

    return (
        <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="break-all font-mono text-xs text-slate-700">
                    {formatDatabaseMigrationPrefix(prefixSummary.prefix)}
                </span>
                <span className="shrink-0 text-xs font-semibold text-slate-500">
                    {formatCountWithNoun(prefixSummary.appliedCount, 'migration file', 'migration files')} applied
                </span>
            </div>
            {isAppliedMigrationFileListVisible && (
                <ul className="mt-2 space-y-1">
                    {prefixSummary.appliedMigrationFiles.map((migrationFile) => (
                        <li key={migrationFile} className="break-all font-mono text-xs text-slate-600">
                            {migrationFile}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/**
 * Renders the database migration status badge.
 *
 * @private internal component of `<UpdateDatabaseMigrationsPanel/>`
 */
function DatabaseMigrationStatusBadge({ status }: { readonly status: UpdateDatabaseMigrationStatus }) {
    return (
        <span
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getDatabaseMigrationStatusClassName(
                status,
            )}`}
        >
            {status}
        </span>
    );
}

/**
 * Formats the database migration status message.
 *
 * @param databaseMigrations - Migration snapshot recorded on the job.
 * @param isJobIdle - Whether no update job has been started yet.
 * @returns Human-readable status message.
 */
function formatDatabaseMigrationStatusMessage(
    databaseMigrations: UpdateDatabaseMigrationSnapshot | null,
    isJobIdle: boolean,
): string {
    if (isJobIdle) {
        return 'No self-update database migration run has been recorded yet.';
    }

    if (!databaseMigrations) {
        return 'Database migration details are not available for this update.';
    }

    const appliedCount = getAppliedDatabaseMigrationCount(databaseMigrations) ?? 0;
    const processedPrefixCount = getProcessedDatabaseMigrationPrefixCount(databaseMigrations) ?? 0;

    if (databaseMigrations.status === 'running') {
        return 'Agents Server database migrations are running.';
    }

    if (databaseMigrations.status === 'succeeded') {
        if (appliedCount === 0) {
            return `Checked ${formatNullableMigrationFileCount(databaseMigrations.totalMigrationFiles)} across ${formatCountWithNoun(
                processedPrefixCount,
                'prefix',
                'prefixes',
            )}. No pending migrations were applied.`;
        }

        return `Applied ${formatCountWithNoun(appliedCount, 'migration file', 'migration files')} across ${formatCountWithNoun(
            processedPrefixCount,
            'prefix',
            'prefixes',
        )}.`;
    }

    if (databaseMigrations.status === 'failed') {
        return databaseMigrations.errorMessage || 'Agents Server database migrations failed during self-update.';
    }

    if (databaseMigrations.status === 'skipped') {
        return databaseMigrations.errorMessage || 'PostgreSQL database migrations were skipped for this update.';
    }

    if (databaseMigrations.status === 'unknown') {
        return 'Database migration details were not recorded for this update job.';
    }

    return 'Waiting for the database migration step.';
}

/**
 * Counts applied migration files across all prefixes.
 *
 * @param databaseMigrations - Migration snapshot recorded on the job.
 * @returns Applied migration count or `null` when no snapshot is available.
 */
function getAppliedDatabaseMigrationCount(databaseMigrations: UpdateDatabaseMigrationSnapshot | null): number | null {
    if (!databaseMigrations) {
        return null;
    }

    return databaseMigrations.perPrefix.reduce((total, prefixSummary) => total + prefixSummary.appliedCount, 0);
}

/**
 * Counts processed prefixes from the migration snapshot.
 *
 * @param databaseMigrations - Migration snapshot recorded on the job.
 * @returns Prefix count or `null` when no snapshot is available.
 */
function getProcessedDatabaseMigrationPrefixCount(
    databaseMigrations: UpdateDatabaseMigrationSnapshot | null,
): number | null {
    if (!databaseMigrations) {
        return null;
    }

    return databaseMigrations.processedPrefixes.length || databaseMigrations.perPrefix.length;
}

/**
 * Formats one migration prefix for display.
 *
 * @param prefix - Raw table prefix.
 * @returns Display label.
 */
function formatDatabaseMigrationPrefix(prefix: string): string {
    return prefix || '<default>';
}

/**
 * Formats a nullable migration file count for a sentence.
 *
 * @param value - Count or `null`.
 * @returns Count string or fallback text.
 */
function formatNullableMigrationFileCount(value: number | null): string {
    return value === null ? 'the available migration files' : formatCountWithNoun(value, 'migration file', 'migration files');
}

/**
 * Formats a count together with its singular/plural noun.
 *
 * @param count - Numeric count.
 * @param singularNoun - Noun used when count is one.
 * @param pluralNoun - Noun used otherwise.
 * @returns Count with noun.
 */
function formatCountWithNoun(count: number, singularNoun: string, pluralNoun: string): string {
    return `${count} ${count === 1 ? singularNoun : pluralNoun}`;
}

/**
 * Resolves status badge styling for database migration status.
 *
 * @param status - Current database migration status.
 * @returns Tailwind class list for the status badge.
 */
function getDatabaseMigrationStatusClassName(status: UpdateDatabaseMigrationStatus): string {
    if (status === 'running') {
        return 'border-blue-200 bg-blue-50 text-blue-700';
    }

    if (status === 'failed') {
        return 'border-rose-200 bg-rose-50 text-rose-700';
    }

    if (status === 'succeeded') {
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    }

    if (status === 'skipped') {
        return 'border-amber-200 bg-amber-50 text-amber-700';
    }

    return 'border-slate-200 bg-white text-slate-500';
}
