import { HARNESS_PLUGINS, getHarnessPlugin } from './harness-plugins/index.js';
import { redactSecrets } from './harness.js';
import type { InspectionOptions, NativeInspection, HarnessVersionCheck } from './harness-plugins/contract.js';
import { checkHarnessUpdates, applyHarnessUpdates } from './harness-plugins/maintenance.js';

/** Read-only installed integration inventory with explicit unknown models/authentication. @private */
export type HarnessInventory = NativeInspection;

/** A setup chooser sees only outdated integrations explicitly selected for this setup. @private */
export type HarnessUpdateChoice = 'keep' | 'all' | readonly string[];

/** Install/login/update operations apply only to explicitly selected integrations. @private */
export interface HarnessSetupOptions extends InspectionOptions {
    names?: string[]; install?: boolean; login?: boolean; interactive?: boolean; checkUpdates?: boolean;
    onOutput?: (text: string) => void;
    chooseUpdates?: (outdated: HarnessVersionCheck[]) => Promise<HarnessUpdateChoice>;
}

/** Saved execution choices must produce a native command before setup can report readiness. @private */
export interface HarnessExecutionInspection extends InspectionOptions {
    model?: string; thinkingLevel?: string; allowCredits?: boolean;
    harnessSettings?: Record<string, { model?: string; thinkingLevel?: string; apiKeyEnv?: string; configurationPath?: string }>;
}

/** Verify advertised native flags and saved defaults without submitting inference or repeating login. @private */
export async function inspectHarnessExecution(projectPath: string, inventory: HarnessInventory[], options: HarnessExecutionInspection = {}): Promise<HarnessInventory[]> {
    return Promise.all(inventory.map(async item => {
        if (!item.usable) return item;
        const plugin = getHarnessPlugin(item.name);
        const settings = options.harnessSettings?.[item.name];
        const model = options.model ?? settings?.model;
        const thinkingLevel = options.thinkingLevel ?? settings?.thinkingLevel;
        try {
            if (model && item.models.length && !item.models.includes(model)) throw new Error(`Saved model ${model} is not available.`);
            if (thinkingLevel && !item.thinkingLevels.includes(thinkingLevel)) throw new Error(`Saved thinking level ${thinkingLevel} is unsupported.`);
            const request = { harness: item.name, projectPath, prompt: 'Project readiness inspection; do not execute.', model, thinkingLevel, allowCredits: options.allowCredits, signal: options.signal, harnessConfiguration: settings };
            const env = { ...process.env };
            await plugin.configure(request, env);
            const help = await plugin.help(request);
            const command = await plugin.prepare({ request, prompt: request.prompt, help, env, authentication: item.authentication === 'none' ? 'unknown' : item.authentication });
            await command.cleanup?.();
            return item;
        } catch (error) { return { ...item, usable: false, diagnostic: `Execution setup is incomplete: ${redactSecrets((error as Error).message, projectPath)}` }; }
    }));
}

/** Discover requested integrations without installation, login, version-network checks or project writes. @private */
export async function inspectHarnesses(projectPath: string, options: InspectionOptions & { names?: string[] } = {}): Promise<HarnessInventory[]> {
    const selected = options.names === undefined ? HARNESS_PLUGINS : [...new Set(options.names)].map(getHarnessPlugin);
    return Promise.all(selected.map((plugin) => plugin.inspect(projectPath, options)));
}

/** Resolve selected global installations, reuse ready native logins and offer verified updates. @private */
export async function setupHarnesses(projectPath: string, options: HarnessSetupOptions = {}): Promise<HarnessInventory[]> {
    const names = [...new Set(options.names || [])];
    const selected = names.map(getHarnessPlugin);
    if (!names.length) return [];
    const output = options.onOutput || ((text: string) => process.stdout.write(text));
    let inventory = await inspectHarnesses(projectPath, { ...options, names });
    for (const plugin of selected) {
        if (options.signal?.aborted) return inventory;
        const entry = inventory.find((entry) => entry.name === plugin.definition.id)!;
        if (!entry.installed && options.install !== false) {
            output(`Installing ${plugin.definition.displayName} globally: ${plugin.definition.install}\n`);
            const result = await plugin.installGlobal(projectPath, options);
            if (result.outcome !== 'installed') output(`${entry.name} installation ${result.outcome}: ${redactSecrets(result.diagnostic, projectPath)}\n`);
        }
    }
    inventory = await inspectHarnesses(projectPath, { ...options, names });
    for (const entry of inventory) {
        if (options.signal?.aborted) return inventory;
        if (!entry.installed || entry.authenticated) continue;
        if (entry.configured === false) { output(`${entry.name}: configuration required. ${entry.diagnostic}\n`); continue; }
        output(`${entry.name}: authentication required. Run ${entry.login}.\n`);
        if (options.login && options.interactive && process.stdin.isTTY && process.stdout.isTTY) {
            const result = await getHarnessPlugin(entry.name).setupNative(projectPath, options);
            output(`${entry.name} native setup ${result.outcome}: ${redactSecrets(result.diagnostic, projectPath)}\n`);
        }
    }
    inventory = await inspectHarnesses(projectPath, { ...options, names });
    if (options.checkUpdates !== false && !options.signal?.aborted) {
        const checks = await checkHarnessUpdates(projectPath, { ...options, names, inventory });
        for (const check of checks) if (check.outcome === 'unknown' || check.outcome === 'unsupported') output(`${check.name} global version check ${check.outcome}: ${redactSecrets(check.diagnostic, projectPath)}\n`);
        const outdated = checks.filter((entry) => entry.outcome === 'outdated');
        if (outdated.length) {
            const choice = options.chooseUpdates ? await options.chooseUpdates(outdated) : 'keep';
            const chosen = choice === 'all' ? outdated.map((entry) => entry.name) : choice === 'keep' ? [] : [...choice];
            for (const name of chosen) if (!outdated.some((entry) => entry.name === name)) throw new Error(`Only outdated selected harnesses may be updated during setup: ${name}`);
            if (!chosen.length) output(`Keeping current global versions: ${outdated.map((entry) => `${entry.name} ${entry.currentVersion}`).join(', ')}.\n`);
            const results = await applyHarnessUpdates(projectPath, outdated.filter((entry) => chosen.includes(entry.name)), options);
            for (const result of results) output(`${result.name} global update ${result.outcome}: ${redactSecrets(result.diagnostic, projectPath)}\n`);
        }
    }
    return inspectHarnesses(projectPath, { ...options, names });
}

/** Global harness maintenance APIs used by the ongoing supervisor. @private */
export { maintainHarnesses, checkHarnessUpdates, applyHarnessUpdates, DEFAULT_HARNESS_UPDATE_INTERVAL_MS } from './harness-plugins/maintenance.js';
/** Diagnostic maintenance contracts are shared by setup and runtime presentation. @private */
export type { HarnessMaintenanceResult, HarnessMaintenanceOptions } from './harness-plugins/maintenance.js';
