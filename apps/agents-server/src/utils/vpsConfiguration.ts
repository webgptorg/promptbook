import { execFile } from 'child_process';
import { constants as filesystemConstants } from 'fs';
import { access, mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { promisify } from 'util';
import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../../src/errors/NotAllowed';
import { normalizeServerDomain } from './serverRegistry';

const execFileAsync = promisify(execFile);

/**
 * Mask rendered for sensitive environment values in the UI.
 */
export const HIDDEN_ENVIRONMENT_VALUE = '********';

/**
 * Environment variable names that can be managed from the standalone VPS UI.
 */
export const VPS_ENVIRONMENT_VARIABLE_KEYS = [
    'SERVERS',
    'NEXT_PUBLIC_SITE_URL',
    'ADMIN_PASSWORD',
    'OPENAI_API_KEY',
    'PTBK_AGENT',
    'PTBK_MODEL',
    'PTBK_THINKING_LEVEL',
    'PORT',
    'PTBK_HOSTNAME',
    'PTBK_PUBLIC_IP_ADDRESS',
    'PTBK_PM2_APP_NAME',
    'PTBK_NGINX_SITE_NAME',
    'LETS_ENCRYPT_EMAIL',
    'PTBK_AGENTS_SERVER_DATABASE',
    'PTBK_AGENTS_SERVER_SQLITE_PATH',
    'SUPABASE_TABLE_PREFIX',
    'SUPABASE_AUTO_MIGRATE',
    'COPILOT_GITHUB_TOKEN',
    'GH_TOKEN',
    'ANTHROPIC_CLAUDE_API_KEY',
    'GOOGLE_GENERATIVE_AI_API_KEY',
    'AZUREOPENAI_API_KEY',
] as const;

/**
 * Editable environment variable key supported by the standalone VPS UI.
 */
export type VpsEnvironmentVariableKey = (typeof VPS_ENVIRONMENT_VARIABLE_KEYS)[number];

/**
 * One environment variable row safe to send to the browser.
 */
export type VpsEnvironmentVariableRecord = {
    /**
     * Environment variable name.
     */
    readonly key: VpsEnvironmentVariableKey;

    /**
     * Masked or plain UI value.
     */
    readonly value: string;

    /**
     * Whether the real stored value is sensitive and hidden.
     */
    readonly isSensitive: boolean;

    /**
     * Whether the variable exists in the `.env` file or current process.
     */
    readonly isDefined: boolean;
};

/**
 * Result of running a VPS command from the admin UI.
 */
export type VpsCommandResult = {
    /**
     * Whether the command was attempted on this host.
     */
    readonly isAvailable: boolean;

    /**
     * Process exit output or skipped reason.
     */
    readonly output: string;
};

/**
 * Parsed `.env` line representation used to preserve comments and ordering.
 */
type ParsedEnvLine =
    | {
          readonly type: 'entry';
          readonly raw: string;
          readonly key: string;
          readonly value: string;
      }
    | {
          readonly type: 'raw';
          readonly raw: string;
      };

/**
 * Returns the installed Agents Server `.env` file path.
 *
 * @returns Absolute path to the editable `.env` file.
 */
export function resolveVpsEnvironmentFilePath(): string {
    const explicitEnvFile = process.env.PTBK_AGENTS_SERVER_ENV_FILE?.trim();
    if (explicitEnvFile) {
        return resolve(explicitEnvFile);
    }

    const explicitInstallDirectory = process.env.PTBK_INSTALL_DIR?.trim();
    if (explicitInstallDirectory) {
        return resolve(explicitInstallDirectory, '.env');
    }

    const sqlitePath = process.env.PTBK_AGENTS_SERVER_SQLITE_PATH?.trim();
    if (sqlitePath) {
        return resolve(dirname(dirname(resolve(sqlitePath))), '.env');
    }

    return resolve(process.cwd(), '.env');
}

/**
 * Reads managed environment variables with sensitive values masked.
 *
 * @returns Safe environment snapshot for the admin UI.
 */
export async function listVpsEnvironmentVariables(): Promise<{
    readonly envFilePath: string;
    readonly variables: ReadonlyArray<VpsEnvironmentVariableRecord>;
}> {
    const envFilePath = resolveVpsEnvironmentFilePath();
    const envValues = await readVpsEnvironmentMap(envFilePath);

    return {
        envFilePath,
        variables: VPS_ENVIRONMENT_VARIABLE_KEYS.map((key) => {
            const rawValue = envValues.get(key) ?? process.env[key] ?? '';
            const isSensitive = isSensitiveEnvironmentVariable(key);
            return {
                key,
                value: isSensitive && rawValue ? HIDDEN_ENVIRONMENT_VALUE : rawValue,
                isSensitive,
                isDefined: rawValue !== '',
            };
        }),
    };
}

/**
 * Updates supported variables in the installed `.env` file.
 *
 * Sensitive variables are updated only when the submitted value is not empty and not the mask.
 *
 * @param updates - Key/value pairs to persist.
 * @returns Safe environment snapshot after writing.
 */
export async function updateVpsEnvironmentVariables(
    updates: Readonly<Record<string, string>>,
): Promise<Awaited<ReturnType<typeof listVpsEnvironmentVariables>>> {
    const normalizedUpdates = normalizeVpsEnvironmentUpdates(updates);
    const envFilePath = resolveVpsEnvironmentFilePath();
    const existingContent = await readOptionalTextFile(envFilePath);
    const nextContent = serializeUpdatedEnvFile(existingContent, normalizedUpdates);

    await mkdir(dirname(envFilePath), { recursive: true });
    await writeFile(envFilePath, nextContent, { encoding: 'utf-8', mode: 0o600 });

    for (const [key, value] of normalizedUpdates) {
        process.env[key] = value;
    }

    return listVpsEnvironmentVariables();
}

/**
 * Reads domains from the installed `.env` file or current process.
 *
 * @returns Normalized configured domains.
 */
export async function listConfiguredVpsDomains(): Promise<Array<string>> {
    const envValues = await readVpsEnvironmentMap(resolveVpsEnvironmentFilePath());
    const rawServers = envValues.get('SERVERS') ?? process.env.SERVERS ?? '';

    return parseDomainsCsv(rawServers);
}

/**
 * Replaces the standalone VPS domain list in `.env`.
 *
 * @param domains - Domains to store in `SERVERS`.
 * @returns Safe environment snapshot after writing.
 */
export async function updateConfiguredVpsDomains(
    domains: ReadonlyArray<string>,
): Promise<Awaited<ReturnType<typeof listVpsEnvironmentVariables>>> {
    const normalizedDomains = normalizeDomains(domains);
    const primaryDomain = normalizedDomains[0] ?? '';
    const updates: Record<string, string> = {
        SERVERS: normalizedDomains.join(','),
    };

    if (primaryDomain) {
        updates.NEXT_PUBLIC_SITE_URL = `https://${primaryDomain}`;
        updates.SUPABASE_TABLE_PREFIX = buildDomainTablePrefix(primaryDomain);
    } else {
        const publicIpAddress = process.env.PTBK_PUBLIC_IP_ADDRESS?.trim();
        updates.NEXT_PUBLIC_SITE_URL = publicIpAddress
            ? `http://${publicIpAddress}`
            : '';
        updates.SUPABASE_TABLE_PREFIX = '';
    }

    return updateVpsEnvironmentVariables(updates);
}

/**
 * Applies Nginx, Certbot, and process-manager changes through the shared VPS installer script.
 *
 * @returns Command output or a skipped reason when not running on a Linux VPS.
 */
export async function applyVpsRuntimeConfiguration(): Promise<VpsCommandResult> {
    return runVpsInstallerCommand('apply-domains', 'VPS runtime configuration can only be applied on Linux.');
}

/**
 * Installs/configures the selected local code runner through the shared VPS installer script.
 *
 * @returns Command output or a skipped reason when not running on a Linux VPS.
 */
export async function applyVpsCodeRunnerConfiguration(): Promise<VpsCommandResult> {
    return runVpsInstallerCommand('apply-runner', 'VPS code-runner configuration can only be applied on Linux.');
}

/**
 * Reads recent pm2 logs for the configured Agents Server process.
 *
 * @param lineCount - Number of lines to request.
 * @returns Log output or a skipped reason.
 */
export async function readVpsPm2Logs(lineCount = 200): Promise<VpsCommandResult> {
    if (process.platform !== 'linux') {
        return {
            isAvailable: false,
            output: 'pm2 logs are available only on the Linux VPS runtime.',
        };
    }

    const appName = process.env.PTBK_PM2_APP_NAME?.trim() || 'promptbook-agents-server';
    const { stdout, stderr } = await execFileAsync('pm2', ['logs', appName, '--nostream', '--lines', String(lineCount)], {
        maxBuffer: 1024 * 1024,
    });

    return {
        isAvailable: true,
        output: [stdout, stderr].filter(Boolean).join('\n').trim(),
    };
}

/**
 * Runs one maintenance subcommand from the shared VPS installer script.
 *
 * @param command - Installer subcommand.
 * @param unavailableOutput - Message returned on non-Linux platforms.
 * @returns Command output or unavailable reason.
 */
async function runVpsInstallerCommand(command: string, unavailableOutput: string): Promise<VpsCommandResult> {
    if (process.platform !== 'linux') {
        return {
            isAvailable: false,
            output: unavailableOutput,
        };
    }

    const scriptPath = await resolveVpsInstallerScriptPath();
    if (!scriptPath) {
        return {
            isAvailable: false,
            output: 'The VPS installer script could not be found on this server.',
        };
    }

    try {
        const { stdout, stderr } = await execFileAsync('bash', [scriptPath, command], {
            env: {
                ...process.env,
                PTBK_NON_INTERACTIVE: '1',
            },
            maxBuffer: 1024 * 1024,
        });

        return {
            isAvailable: true,
            output: [stdout, stderr].filter(Boolean).join('\n').trim(),
        };
    } catch (error) {
        const commandError = error as Error & { readonly stdout?: string; readonly stderr?: string };
        const commandOutput = [commandError.stdout, commandError.stderr, commandError.message]
            .filter(Boolean)
            .join('\n')
            .trim();

        throw new Error(
            spaceTrim(`
                Failed to run VPS installer command \`${command}\`.

                ${commandOutput}
            `),
        );
    }
}

/**
 * Returns whether an environment variable must be masked in the UI.
 *
 * @param key - Environment variable name.
 * @returns `true` when the value is sensitive.
 */
export function isSensitiveEnvironmentVariable(key: string): boolean {
    return /(?:PASSWORD|SECRET|TOKEN|API_KEY|PRIVATE_KEY|CREDENTIAL)/iu.test(key);
}

/**
 * Parses a comma-separated domain list.
 *
 * @param value - Raw `SERVERS` value.
 * @returns Normalized unique domains.
 */
export function parseDomainsCsv(value: string): Array<string> {
    return normalizeDomains(value.split(','));
}

/**
 * Builds the deterministic table prefix used by standalone domain records.
 *
 * @param domain - Normalized domain.
 * @returns Table prefix for the server namespace.
 */
export function buildDomainTablePrefix(domain: string): string {
    const prefixSuffix = domain
        .toLowerCase()
        .replace(/-/gu, '_dash_')
        .replace(/\./gu, '_')
        .replace(/:/gu, '_port_')
        .replace(/[^a-z0-9_]/gu, '_')
        .replace(/_+/gu, '_')
        .replace(/^_+|_+$/gu, '');

    return `server_${prefixSuffix}_`;
}

/**
 * Normalizes a list of raw domain values and removes duplicates.
 *
 * @param domains - Raw domains.
 * @returns Normalized unique domains.
 */
function normalizeDomains(domains: ReadonlyArray<string>): Array<string> {
    const normalizedDomains: Array<string> = [];

    for (const rawDomain of domains) {
        const normalizedDomain = normalizeServerDomain(rawDomain);
        if (!normalizedDomain || normalizedDomains.includes(normalizedDomain)) {
            continue;
        }

        normalizedDomains.push(normalizedDomain);
    }

    return normalizedDomains;
}

/**
 * Reads a `.env` file into a map.
 *
 * @param envFilePath - File to parse.
 * @returns Parsed environment map.
 */
async function readVpsEnvironmentMap(envFilePath: string): Promise<Map<string, string>> {
    const content = await readOptionalTextFile(envFilePath);
    const envMap = new Map<string, string>();

    for (const line of parseEnvLines(content)) {
        if (line.type === 'entry') {
            envMap.set(line.key, line.value);
        }
    }

    return envMap;
}

/**
 * Normalizes update payloads and rejects unsupported keys.
 *
 * @param updates - Raw request updates.
 * @returns Supported update entries.
 */
function normalizeVpsEnvironmentUpdates(updates: Readonly<Record<string, string>>): Map<string, string> {
    const normalizedUpdates = new Map<string, string>();

    for (const [rawKey, rawValue] of Object.entries(updates)) {
        if (!isVpsEnvironmentVariableKey(rawKey)) {
            throw new NotAllowed(
                spaceTrim(`
                    Environment variable \`${rawKey}\` is not editable through the Agents Server UI.
                `),
            );
        }

        if (typeof rawValue !== 'string') {
            continue;
        }

        const value = rawValue.trim();
        if (isSensitiveEnvironmentVariable(rawKey) && (value === '' || value === HIDDEN_ENVIRONMENT_VALUE)) {
            continue;
        }

        normalizedUpdates.set(rawKey, value);
    }

    return normalizedUpdates;
}

/**
 * Checks whether a raw key is supported by the VPS UI.
 *
 * @param key - Candidate environment variable key.
 * @returns `true` when supported.
 */
function isVpsEnvironmentVariableKey(key: string): key is VpsEnvironmentVariableKey {
    return VPS_ENVIRONMENT_VARIABLE_KEYS.includes(key as VpsEnvironmentVariableKey);
}

/**
 * Serializes an updated `.env` file while preserving unrelated lines.
 *
 * @param existingContent - Current file content.
 * @param updates - Normalized updates to apply.
 * @returns Next file content.
 */
function serializeUpdatedEnvFile(existingContent: string, updates: ReadonlyMap<string, string>): string {
    const remainingUpdates = new Map(updates);
    const nextLines = parseEnvLines(existingContent).map((line) => {
        if (line.type !== 'entry' || !remainingUpdates.has(line.key)) {
            return line.raw;
        }

        const nextValue = remainingUpdates.get(line.key)!;
        remainingUpdates.delete(line.key);
        return `${line.key}=${nextValue}`;
    });

    for (const [key, value] of remainingUpdates) {
        nextLines.push(`${key}=${value}`);
    }

    return `${nextLines.join('\n').replace(/\n+$/u, '')}\n`;
}

/**
 * Parses `.env` content into structured lines.
 *
 * @param content - Raw `.env` content.
 * @returns Parsed line records.
 */
function parseEnvLines(content: string): Array<ParsedEnvLine> {
    return content.split(/\r?\n/u).map((raw) => {
        const match = raw.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/u);
        if (!match) {
            return { type: 'raw', raw };
        }

        const [, key, rawValue = ''] = match;
        return {
            type: 'entry',
            raw,
            key,
            value: parseEnvValue(rawValue),
        };
    });
}

/**
 * Parses the common `.env` value quoting forms.
 *
 * @param rawValue - Raw text after `=`.
 * @returns Unquoted value.
 */
function parseEnvValue(rawValue: string): string {
    const trimmedValue = rawValue.trim();
    if (
        (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
        (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
    ) {
        return trimmedValue.slice(1, -1);
    }

    return trimmedValue;
}

/**
 * Reads a text file and returns an empty string when it does not exist.
 *
 * @param filePath - File to read.
 * @returns File content or empty string.
 */
async function readOptionalTextFile(filePath: string): Promise<string> {
    try {
        return await readFile(filePath, 'utf-8');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return '';
        }

        throw error;
    }
}

/**
 * Resolves the shared VPS installer script path.
 *
 * @returns Script path or `null` when unavailable.
 */
async function resolveVpsInstallerScriptPath(): Promise<string | null> {
    const candidates = [
        process.env.PTBK_VPS_INSTALL_SCRIPT?.trim(),
        process.env.PTBK_REPOSITORY_DIR ? join(process.env.PTBK_REPOSITORY_DIR, 'other/vps/install.sh') : '',
        join(process.cwd(), 'other/vps/install.sh'),
        join(process.cwd(), '../../other/vps/install.sh'),
    ].filter((candidate): candidate is string => Boolean(candidate));

    for (const candidate of candidates) {
        const absoluteCandidate = resolve(candidate);
        try {
            await access(absoluteCandidate, filesystemConstants.R_OK);
            return absoluteCandidate;
        } catch {
            // Try the next candidate.
        }
    }

    return null;
}
