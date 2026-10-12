import { readFile, mkdir, rename, writeFile, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { getHarnessPlugin } from './index.js';
import type { HarnessOperationResult, HarnessVersionCheck, InspectionOptions, NativeInspection } from './contract.js';
import { harnessStateDirectory } from './locks.js';

/** Later launches recheck global installations at a bounded interval, including failed probes. @private */
export const DEFAULT_HARNESS_UPDATE_INTERVAL_MS = 30 * 60 * 1000;

/** Keep failed state-storage attempts bounded even when the global cache cannot be written. */
const MAINTENANCE_MEMORY = new Map<string, HarnessMaintenanceResult>();

/** Maintenance belongs to selected global installations and preserves actual readiness evidence. @private */
export interface HarnessMaintenanceResult {
    name: string; outcome: HarnessVersionCheck['outcome'] | HarnessOperationResult['outcome'];
    currentVersion?: string; latestVersion?: string; usable: boolean; diagnostic: string; checkedAt: number;
}

/** Runtime may disable automatic maintenance temporarily without changing project selections. @private */
export interface HarnessMaintenanceOptions extends InspectionOptions {
    names: string[]; autoUpdate?: boolean; force?: boolean; intervalMs?: number; now?: () => number;
    onOutput?: (text: string) => void;
}

/** Check only requested installations after they have been resolved, never the unselected catalog. @private */
export async function checkHarnessUpdates(projectPath: string, options: InspectionOptions & { names: string[]; inventory?: NativeInspection[] }): Promise<HarnessVersionCheck[]> {
    const results: HarnessVersionCheck[] = [];
    for (const name of [...new Set(options.names)]) {
        if (options.signal?.aborted) break;
        const plugin = getHarnessPlugin(name);
        const current = options.inventory?.find((entry) => entry.name === name) || await plugin.inspect(projectPath, options);
        results.push(await plugin.checkVersion(projectPath, current, options));
    }
    return results;
}

/** Attempt authorized updates sequentially; integration locks protect every shared installation. @private */
export async function applyHarnessUpdates(projectPath: string, checks: HarnessVersionCheck[], options: InspectionOptions & { onOutput?: (text: string) => void } = {}): Promise<HarnessOperationResult[]> {
    const results: HarnessOperationResult[] = [];
    for (const check of checks) {
        if (options.signal?.aborted) break;
        if (check.outcome !== 'outdated') continue;
        results.push(await getHarnessPlugin(check.name).updateGlobal(projectPath, check, options));
    }
    return results;
}

/** Persist bounded maintenance evidence atomically outside the project for future supervisors. */
async function saveMaintenance(path: string, result: HarnessMaintenanceResult): Promise<void> {
    const temporary = `${path}.${randomUUID()}.tmp`;
    try {
        await writeFile(temporary, `${JSON.stringify(result)}\n`, { mode: 0o600, flag: 'wx' });
        await rename(temporary, path);
    } finally { await rm(temporary, { force: true }); }
}

/** Reuse recent outcomes, including unknown/latest failures, to prevent retrying in a tight loop. */
async function cachedMaintenance(path: string, now: number, interval: number): Promise<HarnessMaintenanceResult | undefined> {
    try {
        const memory = MAINTENANCE_MEMORY.get(path);
        const text = memory ? JSON.stringify(memory) : await readFile(path, 'utf8');
        if (text.length > 128_000) return undefined;
        const result = JSON.parse(text) as HarnessMaintenanceResult;
        if (typeof result.checkedAt !== 'number' || typeof result.name !== 'string' || typeof result.diagnostic !== 'string' || typeof result.usable !== 'boolean' || now < result.checkedAt || now - result.checkedAt >= interval) return undefined;
        return result;
    } catch { return undefined; }
}

/** Check/update enabled global installations at safe boundaries and expose actual maintenance outcomes. @private */
export async function maintainHarnesses(projectPath: string, options: HarnessMaintenanceOptions): Promise<HarnessMaintenanceResult[]> {
    if (options.autoUpdate === false) return [];
    const names = [...new Set(options.names)];
    // Validate all names before network access, installation or global state mutation.
    for (const name of names) getHarnessPlugin(name);
    if (!names.length) return [];
    const now = (options.now || Date.now)();
    const interval = Math.max(60_000, options.intervalMs ?? DEFAULT_HARNESS_UPDATE_INTERVAL_MS);
    const directory = harnessStateDirectory(options);
    let stateDiagnostic: string | undefined;
    try { await mkdir(directory, { recursive: true, mode: 0o700 }); }
    catch (error) { stateDiagnostic = `Global maintenance state is unavailable: ${(error as Error).message}. Checks are bounded in this process; repair global cache permissions for cross-process persistence.`; }
    const results: HarnessMaintenanceResult[] = [];
    for (const name of names) {
        if (options.signal?.aborted) break;
        const path = join(directory, `${name}-maintenance.json`);
        const cached = options.force ? undefined : await cachedMaintenance(path, now, interval);
        if (cached) { results.push(cached); continue; }
        const plugin = getHarnessPlugin(name);
        let current = await plugin.inspect(projectPath, options);
        const check = await plugin.checkVersion(projectPath, current, options);
        let result: HarnessMaintenanceResult = { ...check, usable: current.usable, checkedAt: now };
        if (check.outcome === 'outdated') {
            options.onOutput?.(`${name}: updating the shared global installation from ${check.currentVersion} to ${check.latestVersion}.\n`);
            const operation = await plugin.updateGlobal(projectPath, check, options);
            current = await plugin.inspect(projectPath, options);
            result = { name, outcome: operation.outcome, currentVersion: current.version, latestVersion: check.latestVersion, usable: current.usable, diagnostic: operation.diagnostic, checkedAt: now };
        }
        try { await saveMaintenance(path, result); }
        catch (error) { stateDiagnostic ||= `Could not persist global maintenance evidence: ${(error as Error).message}. Checks are bounded in this process; repair global cache permissions.`; }
        if (stateDiagnostic) result.diagnostic += ` ${stateDiagnostic}`;
        MAINTENANCE_MEMORY.set(path, { ...result });
        options.onOutput?.(`${name} global maintenance ${result.outcome}: ${result.diagnostic}\n`);
        results.push(result);
    }
    return results;
}
