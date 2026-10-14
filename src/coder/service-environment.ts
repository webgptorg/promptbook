import { delimiter, dirname } from 'node:path';

/** Non-secret discovery paths retained across OS-managed daemon launches. */
const SERVICE_PATH_KEYS = ['PATH', 'CODEX_HOME', 'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_STATE_HOME', 'XDG_CACHE_HOME'] as const;

/** Provider credentials remain in their native stores, never in this restart metadata. @private */
export type ServiceEnvironment = Partial<Record<typeof SERVICE_PATH_KEYS[number], string>>;

/** Capture only executable/native-store locations, without persisting arbitrary environment secrets. @private */
export function captureServiceEnvironment(env: NodeJS.ProcessEnv = process.env): ServiceEnvironment {
    const saved: ServiceEnvironment = {};
    for (const key of SERVICE_PATH_KEYS) {
        const actual = Object.keys(env).find(name => name.toUpperCase() === key);
        if (actual !== undefined && env[actual] !== undefined) saved[key] = env[actual];
    }
    return saved;
}

/** Restore launch discovery before any Git/provider probe; older records retain Node's global bin fallback. @private */
export function restoreServiceEnvironment(saved: unknown, env: NodeJS.ProcessEnv = process.env, node = process.execPath): void {
    if (saved !== undefined && (!saved || typeof saved !== 'object' || Array.isArray(saved))) throw new Error('Invalid daemon discovery environment; restart ptbk from the configured terminal.');
    const entries = Object.entries(saved ?? {});
    for (const [key, value] of entries) if (!SERVICE_PATH_KEYS.includes(key as typeof SERVICE_PATH_KEYS[number]) || typeof value !== 'string' || value.includes('\0')) throw new Error('Invalid daemon discovery environment; only non-secret path settings are supported.');
    const pathKey = Object.keys(env).find(key => key.toUpperCase() === 'PATH') ?? 'PATH';
    const path = (saved as ServiceEnvironment | undefined)?.PATH;
    const directories = [...(path === undefined ? [dirname(node)] : path.split(delimiter)), ...(env[pathKey] ?? '').split(delimiter), dirname(node)].filter(Boolean);
    env[pathKey] = [...new Set(directories)].join(delimiter);
    for (const [key, value] of entries) if (key !== 'PATH') env[key] = value as string;
}
