import { execFile } from 'child_process';
import { createHash } from 'crypto';
import { promisify } from 'util';
import { AGENT_PROJECT_RUNTIME_HOST } from './agentProjectRuntimeConstants';
import type { AgentProjectRuntimeMode } from './AgentProjectRuntimeInfo';

const execFileAsync = promisify(execFile);

/**
 * Environment variable that can force-enable or force-disable pm2 project runtimes.
 */
export const PTBK_AGENT_PROJECT_RUNTIME_PM2_ENABLED_ENV = 'PTBK_AGENT_PROJECT_RUNTIME_PM2_ENABLED';

/**
 * pm2 executable name installed by the VPS installer.
 */
const PM2_COMMAND = 'pm2';

/**
 * Shell used for custom project dev commands on the standalone VPS.
 */
const PROJECT_DEV_SHELL_COMMAND = 'bash';

/**
 * Static file server executable available on Ubuntu VPS installations.
 */
const STATIC_SERVER_COMMAND = 'python3';

/**
 * Stable prefix for pm2 processes owned by project runtimes.
 */
const AGENT_PROJECT_PM2_PROCESS_NAME_PREFIX = 'promptbook-project';

/**
 * Hash length used to keep pm2 process names short but stable.
 */
const AGENT_PROJECT_PM2_PROCESS_HASH_LENGTH = 12;

/**
 * Project-name suffix length used in pm2 process names.
 */
const AGENT_PROJECT_PM2_PROCESS_LABEL_LENGTH = 36;

/**
 * Max output retained from pm2 commands.
 */
const PM2_COMMAND_MAX_BUFFER_BYTES = 1024 * 1024;

/**
 * Status snapshot for one pm2 process.
 */
export type AgentProjectRuntimePm2Status = {
    /**
     * Whether pm2 knows the process name.
     */
    readonly isKnown: boolean;

    /**
     * Whether pm2 reports the process as online.
     */
    readonly isRunning: boolean;

    /**
     * Current operating-system process id, or `null` when unavailable.
     */
    readonly processId: number | null;

    /**
     * Raw pm2 status string.
     */
    readonly status: string | null;
};

/**
 * Result of starting one pm2 project process.
 */
export type StartAgentProjectRuntimePm2ProcessResult = {
    /**
     * Stable pm2 process name.
     */
    readonly processName: string;

    /**
     * Operating-system process id, or `null` when pm2 has not reported it yet.
     */
    readonly processId: number | null;
};

/**
 * Options used to start one pm2 project runtime.
 */
export type StartAgentProjectRuntimePm2ProcessOptions = {
    /**
     * Permanent id of the agent owning the project.
     */
    readonly agentPermanentId: string;

    /**
     * Directory name of the project.
     */
    readonly projectName: string;

    /**
     * Absolute project directory path.
     */
    readonly projectPath: string;

    /**
     * Runtime mode to start.
     */
    readonly mode: Extract<AgentProjectRuntimeMode, 'dev-server' | 'static-server'>;

    /**
     * Assigned local TCP port.
     */
    readonly port: number;

    /**
     * Shell command for dev runtimes, or `null` for static runtimes.
     */
    readonly command: string | null;

    /**
     * Public browser URL assigned to the runtime.
     */
    readonly publicUrl: string;

    /**
     * Local loopback URL assigned to the runtime.
     */
    readonly localUrl: string;
};

/**
 * Returns whether the current process should use pm2 for project runtimes.
 *
 * @returns `true` on production Linux unless explicitly disabled.
 */
export function isAgentProjectRuntimePm2Enabled(): boolean {
    const configuredValue = process.env[PTBK_AGENT_PROJECT_RUNTIME_PM2_ENABLED_ENV]?.trim().toLowerCase();

    if (configuredValue) {
        return ['1', 'true', 'yes', 'y'].includes(configuredValue);
    }

    return process.platform === 'linux' && process.env.NODE_ENV === 'production';
}

/**
 * Starts one agent project as a pm2-managed process.
 *
 * @param options - Project runtime process options.
 * @returns pm2 process identity.
 */
export async function startAgentProjectRuntimePm2Process(
    options: StartAgentProjectRuntimePm2ProcessOptions,
): Promise<StartAgentProjectRuntimePm2ProcessResult> {
    const processName = createAgentProjectRuntimePm2ProcessName(options);
    const command = createAgentProjectRuntimePm2Command(options);

    await stopAgentProjectRuntimePm2Process(processName);
    await execFileAsync(
        PM2_COMMAND,
        [
            'start',
            command.executable,
            '--name',
            processName,
            '--time',
            '--cwd',
            options.projectPath,
            '--',
            ...command.arguments,
        ],
        {
            env: createAgentProjectRuntimePm2Environment(options),
            maxBuffer: PM2_COMMAND_MAX_BUFFER_BYTES,
            windowsHide: true,
        },
    );
    await savePm2ProcessList();

    const status = await resolveAgentProjectRuntimePm2Status(processName);
    return {
        processName,
        processId: status.processId,
    };
}

/**
 * Stops one pm2 project process when it exists.
 *
 * @param processName - pm2 process name.
 */
export async function stopAgentProjectRuntimePm2Process(processName: string | null | undefined): Promise<void> {
    if (!processName) {
        return;
    }

    const status = await resolveAgentProjectRuntimePm2Status(processName);

    if (!status.isKnown) {
        return;
    }

    await execFileAsync(PM2_COMMAND, ['delete', processName], {
        maxBuffer: PM2_COMMAND_MAX_BUFFER_BYTES,
        windowsHide: true,
    });
    await savePm2ProcessList();
}

/**
 * Resolves pm2 status for one project process.
 *
 * @param processName - pm2 process name.
 * @returns pm2 process status.
 */
export async function resolveAgentProjectRuntimePm2Status(
    processName: string | null | undefined,
): Promise<AgentProjectRuntimePm2Status> {
    if (!processName || !isAgentProjectRuntimePm2Enabled()) {
        return createMissingPm2Status();
    }

    try {
        const { stdout } = await execFileAsync(PM2_COMMAND, ['jlist'], {
            maxBuffer: PM2_COMMAND_MAX_BUFFER_BYTES,
            windowsHide: true,
        });
        const processInfo = parsePm2ProcessList(stdout).find((item) => item.name === processName);

        if (!processInfo) {
            return createMissingPm2Status();
        }

        return {
            isKnown: true,
            isRunning: processInfo.status === 'online',
            processId: processInfo.processId,
            status: processInfo.status,
        };
    } catch {
        return createMissingPm2Status();
    }
}

/**
 * Creates a stable pm2 process name for one agent project.
 *
 * @param options - Project identity.
 * @returns pm2-safe process name.
 */
export function createAgentProjectRuntimePm2ProcessName(options: {
    readonly agentPermanentId: string;
    readonly projectName: string;
}): string {
    const hash = createHash('sha1')
        .update(`${options.agentPermanentId}\n${options.projectName}`)
        .digest('hex')
        .slice(0, AGENT_PROJECT_PM2_PROCESS_HASH_LENGTH);
    const label = options.projectName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/gu, '-')
        .replace(/-+/gu, '-')
        .replace(/^-+|-+$/gu, '')
        .slice(0, AGENT_PROJECT_PM2_PROCESS_LABEL_LENGTH)
        .replace(/-+$/gu, '');

    return [AGENT_PROJECT_PM2_PROCESS_NAME_PREFIX, hash, label || 'project'].join('-');
}

/**
 * Builds pm2 executable and arguments for one runtime mode.
 */
function createAgentProjectRuntimePm2Command(options: StartAgentProjectRuntimePm2ProcessOptions): {
    readonly executable: string;
    readonly arguments: ReadonlyArray<string>;
} {
    if (options.mode === 'static-server') {
        return {
            executable: STATIC_SERVER_COMMAND,
            arguments: ['-m', 'http.server', String(options.port), '--bind', AGENT_PROJECT_RUNTIME_HOST],
        };
    }

    return {
        executable: PROJECT_DEV_SHELL_COMMAND,
        arguments: ['-lc', `exec ${options.command || ''}`],
    };
}

/**
 * Creates the environment captured by pm2 for a project runtime process.
 */
function createAgentProjectRuntimePm2Environment(
    options: StartAgentProjectRuntimePm2ProcessOptions,
): NodeJS.ProcessEnv {
    return {
        ...process.env,
        HOST: AGENT_PROJECT_RUNTIME_HOST,
        HOSTNAME: AGENT_PROJECT_RUNTIME_HOST,
        PORT: String(options.port),
        PTBK_AGENT_PROJECT_LOCAL_URL: options.localUrl,
        PTBK_AGENT_PROJECT_PUBLIC_URL: options.publicUrl,
    };
}

/**
 * Parses the pm2 JSON process list into the fields used by the runtime registry.
 */
function parsePm2ProcessList(rawValue: string): Array<{
    readonly name: string;
    readonly processId: number | null;
    readonly status: string | null;
}> {
    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
        return [];
    }

    return parsedValue
        .map((item) => {
            if (!item || typeof item !== 'object') {
                return null;
            }

            const processRecord = item as {
                readonly name?: unknown;
                readonly pid?: unknown;
                readonly pm2_env?: { readonly status?: unknown };
            };
            const name = typeof processRecord.name === 'string' ? processRecord.name : '';

            if (!name) {
                return null;
            }

            return {
                name,
                processId: typeof processRecord.pid === 'number' && processRecord.pid > 0 ? processRecord.pid : null,
                status: typeof processRecord.pm2_env?.status === 'string' ? processRecord.pm2_env.status : null,
            };
        })
        .filter(
            (
                item,
            ): item is {
                readonly name: string;
                readonly processId: number | null;
                readonly status: string | null;
            } => item !== null,
        );
}

/**
 * Saves the current pm2 process list for reboot resurrection.
 */
async function savePm2ProcessList(): Promise<void> {
    await execFileAsync(PM2_COMMAND, ['save'], {
        maxBuffer: PM2_COMMAND_MAX_BUFFER_BYTES,
        windowsHide: true,
    });
}

/**
 * Creates the fallback status for missing or unavailable pm2 processes.
 */
function createMissingPm2Status(): AgentProjectRuntimePm2Status {
    return {
        isKnown: false,
        isRunning: false,
        processId: null,
        status: null,
    };
}
