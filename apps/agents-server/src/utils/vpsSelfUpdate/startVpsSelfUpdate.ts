import { spawn } from 'child_process';
import { mkdir, open } from 'fs/promises';
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
import { readPersistedVpsSelfUpdateJob } from './readPersistedVpsSelfUpdateJob';
import { readVpsSelfUpdateOverview } from './readVpsSelfUpdateOverview';
import {
    encodeStatusField,
    resolveVpsSelfUpdateLogFilePath,
    resolveVpsSelfUpdateStatusFilePath,
    writeVpsSelfUpdateStatusFile,
} from './vpsSelfUpdateStateFiles';
import type { VpsSelfUpdateOverview, VpsSelfUpdateStartRequest } from './vpsSelfUpdateTypes';

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

    const currentJob = await readPersistedVpsSelfUpdateJob();
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

    const statusFilePath = resolveVpsSelfUpdateStatusFilePath();
    const logFilePath = resolveVpsSelfUpdateLogFilePath();
    const startedAt = new Date().toISOString();
    await mkdir(dirname(logFilePath), { recursive: true });
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
                PTBK_TARGET_REPOSITORY_REF: targetRef,
                PROMPTBOOK_REPOSITORY_URL: originRepositoryUrl,
            },
        });

        await writeVpsSelfUpdateStatusFile({
            STATUS: 'running',
            PID: String(child.pid ?? ''),
            TARGET_REF: targetRef,
            CURRENT_STEP_B64: encodeStatusField('Queued standalone VPS self-update.'),
            ERROR_MESSAGE_B64: '',
            STARTED_AT: startedAt,
            FINISHED_AT: '',
            CURRENT_COMMIT: '',
            TARGET_COMMIT: '',
            LOG_FILE: logFilePath,
        });

        child.unref();
    } finally {
        await logHandle.close();
    }

    return readVpsSelfUpdateOverview();
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
