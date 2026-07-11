import { spawn } from 'child_process';
import { mkdir, open, rm } from 'fs/promises';
import { dirname } from 'path';
import { NotAllowed } from '../../../../../src/errors/NotAllowed';
import { spaceTrim } from 'spacetrim';
import { createVpsInstallerCommandEnvironment, resolveVpsInstallerScriptPath } from '../vpsConfiguration';
import { resolveVpsSelfUpdateEnvironment } from './vpsSelfUpdateEnvironment';
import {
    normalizeVpsSelfUpdateOriginRepositoryUrl,
    persistVpsSelfUpdateOriginRepositoryUrl,
    readConfiguredVpsSelfUpdateOriginRepositoryUrl,
} from './vpsSelfUpdateOriginRepository';
import { preserveVpsSelfUpdateJobInTaskHistory } from './vpsSelfUpdateJobHistory';
import { readPersistedVpsSelfUpdateJob } from './readPersistedVpsSelfUpdateJob';
import { readVpsSelfUpdateOverview } from './readVpsSelfUpdateOverview';
import {
    encodeStatusField,
    resolveVpsSelfUpdateDatabaseMigrationSummaryFilePath,
    resolveVpsSelfUpdateLogFilePath,
    resolveVpsSelfUpdateStatusFilePath,
    writeVpsSelfUpdateStatusFile,
} from './vpsSelfUpdateStateFiles';
import type { VpsSelfUpdateJobTrigger, VpsSelfUpdateOverview, VpsSelfUpdateStartRequest } from './vpsSelfUpdateTypes';

/**
 * Starts one detached VPS self-update run for the selected environment.
 *
 * The actual update is executed by `other/vps/install.sh self-update`, while this
 * helper writes the initial persisted state and detaches the background process so
 * the triggering HTTP request can finish before pm2 restarts the server.
 *
 * @param request - Update request payload.
 * @returns Fresh overview including the running background job.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function startVpsSelfUpdate(request: VpsSelfUpdateStartRequest): Promise<VpsSelfUpdateOverview> {
    if (process.platform !== 'linux') {
        throw new NotAllowed(
            spaceTrim(`
                Self-update is available only on the standalone Linux VPS deployment.
            `),
        );
    }

    const targetEnvironment = resolveVpsSelfUpdateEnvironment(request.environmentId);
    const trigger = normalizeVpsSelfUpdateJobTrigger(request.trigger);
    const isCustomEnvironment = targetEnvironment.isCustom;
    const targetRef = isCustomEnvironment
        ? normalizeVpsSelfUpdateArbitraryRef(request.customRef)
        : targetEnvironment.branch;

    if (isCustomEnvironment && !targetRef) {
        throw new NotAllowed(
            spaceTrim(`
                A custom self-update requires a non-empty target ref (commit hash, tag, or branch).
            `),
        );
    }

    const requestedOriginUrl = normalizeVpsSelfUpdateOriginRepositoryUrl(request.originRepositoryUrl);
    if (requestedOriginUrl !== null) {
        await persistVpsSelfUpdateOriginRepositoryUrl(requestedOriginUrl);
    }

    const originRepositoryUrl = requestedOriginUrl || (await readConfiguredVpsSelfUpdateOriginRepositoryUrl());

    const currentJob = await readPersistedVpsSelfUpdateJob({ isLogTailIncluded: false });
    if (currentJob.status === 'running' && !currentJob.isStale) {
        throw new NotAllowed(
            spaceTrim(`
                A standalone VPS self-update is already running.
            `),
        );
    }

    const scriptPath = await resolveVpsInstallerScriptPath();
    if (!scriptPath) {
        throw new NotAllowed('The shared VPS installer script could not be found on this server.');
    }
    await preserveVpsSelfUpdateJobInTaskHistory(currentJob);

    const statusFilePath = resolveVpsSelfUpdateStatusFilePath();
    const logFilePath = resolveVpsSelfUpdateLogFilePath();
    const databaseMigrationSummaryFilePath = resolveVpsSelfUpdateDatabaseMigrationSummaryFilePath();
    const startedAt = new Date().toISOString();
    const jobId = createVpsSelfUpdateJobId(startedAt);
    await mkdir(dirname(logFilePath), { recursive: true });
    await rm(databaseMigrationSummaryFilePath, { force: true });
    const logHandle = await open(logFilePath, 'a');

    try {
        const installerArguments = isCustomEnvironment
            ? [scriptPath, 'self-update', '--ref', targetRef]
            : [scriptPath, 'self-update', '--branch', targetRef];

        const child = spawn('bash', installerArguments, {
            detached: true,
            stdio: ['ignore', logHandle.fd, logHandle.fd],
            env: {
                ...createVpsInstallerCommandEnvironment(),
                PTBK_SELF_UPDATE_STATUS_FILE: statusFilePath,
                PTBK_SELF_UPDATE_LOG_FILE: logFilePath,
                PTBK_SELF_UPDATE_JOB_ID: jobId,
                PTBK_SELF_UPDATE_TRIGGER: trigger,
                PTBK_TARGET_REPOSITORY_REF: targetRef,
                PTBK_DATABASE_MIGRATION_SUMMARY_FILE: databaseMigrationSummaryFilePath,
                PROMPTBOOK_REPOSITORY_URL: originRepositoryUrl,
            },
        });

        await writeVpsSelfUpdateStatusFile({
            JOB_ID: jobId,
            STATUS: 'running',
            TRIGGER: trigger,
            PID: String(child.pid ?? ''),
            TARGET_REF: targetRef,
            CURRENT_STEP_B64: encodeStatusField(createQueuedVpsSelfUpdateStep(trigger)),
            ERROR_MESSAGE_B64: '',
            STARTED_AT: startedAt,
            FINISHED_AT: '',
            CURRENT_COMMIT: '',
            TARGET_COMMIT: '',
            LOG_FILE: logFilePath,
            DATABASE_MIGRATION_STATUS: 'pending',
            DATABASE_MIGRATION_SUMMARY_FILE: databaseMigrationSummaryFilePath,
            DATABASE_MIGRATION_SUMMARY_B64: '',
            DATABASE_MIGRATION_ERROR_MESSAGE_B64: '',
        });

        child.unref();
    } finally {
        await logHandle.close();
    }

    return readVpsSelfUpdateOverview();
}

/**
 * Creates a stable identifier for one self-update run.
 *
 * @param startedAt - ISO timestamp of the self-update start.
 * @returns Self-update job id.
 */
function createVpsSelfUpdateJobId(startedAt: string): string {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
        return globalThis.crypto.randomUUID();
    }

    const startedAtFingerprint = startedAt.replace(/[^0-9]/gu, '');
    const randomFingerprint = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(36);

    return `self-update-${startedAtFingerprint}-${process.pid}-${randomFingerprint}`;
}

/**
 * Normalizes one self-update trigger value.
 *
 * @param trigger - Optional trigger from the caller.
 * @returns Supported trigger value.
 */
function normalizeVpsSelfUpdateJobTrigger(trigger: VpsSelfUpdateJobTrigger | undefined): VpsSelfUpdateJobTrigger {
    return trigger === 'automatic' ? 'automatic' : 'manual';
}

/**
 * Builds the initial queued status step for the selected trigger.
 *
 * @param trigger - Source that started the update.
 * @returns Human-readable initial status.
 */
function createQueuedVpsSelfUpdateStep(trigger: VpsSelfUpdateJobTrigger): string {
    return trigger === 'automatic'
        ? 'Queued automatic standalone VPS self-update.'
        : 'Queued standalone VPS self-update.';
}

/**
 * Normalizes one free-form arbitrary git ref entered by the super admin.
 *
 * @param value - Raw user-provided ref.
 * @returns Trimmed ref or empty string when invalid.
 */
function normalizeVpsSelfUpdateArbitraryRef(value: string | null | undefined): string {
    const trimmedValue = value?.trim() || '';
    if (!trimmedValue) {
        return '';
    }

    if (!/^[A-Za-z0-9._/-]+$/u.test(trimmedValue)) {
        throw new NotAllowed(
            spaceTrim(`
                The provided git ref \`${trimmedValue}\` contains unsupported characters.

                **Only letters, digits, dots, underscores, slashes, and dashes are allowed.**
            `),
        );
    }

    return trimmedValue;
}
