import { spawn } from 'node:child_process';
import { access, realpath, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, isAbsolute, resolve, relative, sep } from 'node:path';
import { runProcess, resolveProcessCommand, redactSecrets } from '../harness-process.js';
import type { HarnessRequest } from '../harness.js';
import type { ExecutionInput, HarnessCommand, HarnessDefinition, HarnessOperationResult, HarnessPlugin, HarnessConfiguration, InspectionOptions, InvocationInput, NativeInspection, NativeInspectionContext } from './contract.js';
import { withHarnessUpdate, acquireHarnessUsage } from './locks.js';

/** Native integration hooks; common experiences never dispatch on provider names. @private */
export interface NativeHooks {
    inspectNative(base: NativeInspection, context: NativeInspectionContext): Promise<void>;
    authenticate?(request: HarnessRequest, env: NodeJS.ProcessEnv): Promise<'account' | 'api' | 'unknown'>;
    prepare(input: InvocationInput): Promise<HarnessCommand>;
    executeWithTools?(input: ExecutionInput & { bridge: NonNullable<ExecutionInput['bridge']> }): Promise<Awaited<ReturnType<typeof runProcess>>>;
}

/** Shared normalized model/effort validation, without replacing unsupported requirements. @private */
export function invocationContext(definition: HarnessDefinition, input: InvocationInput) {
    const model = !input.request.model || input.request.model === 'default' ? (definition.nativeDefault ? undefined : definition.defaultModel) : input.request.model;
    const thinking = input.request.thinkingLevel || definition.defaultThinking;
    if (thinking && !definition.thinkingLevels.includes(thinking)) throw new Error(`${definition.name} does not support --thinking-level ${thinking}; supported: ${definition.thinkingLevels.join(', ') || 'none'}`);
    /** Require the installed CLI to advertise every required argument. */
    function requireFlag(flag: string): void {
        if (!input.help.includes(flag)) throw new Error(`${definition.name} installed CLI does not advertise required capability ${flag}; update the provider CLI. See ${definition.documentation}`);
    }
    return { model, thinking, requireFlag };
}

/** Resolve the actual PATH installation without invoking a provider or creating project files. @private */
export async function discoverGlobalExecutable(executable: string, projectPath: string): Promise<{ path?: string; diagnostic?: string }> {
    const extensions = process.platform === 'win32' ? ['', '.exe', '.com', '.cmd', '.bat'] : [''];
    const directories = isAbsolute(executable) ? [''] : (process.env.PATH || process.env.Path || '').split(delimiter);
    for (const directory of directories) for (const extension of extensions) {
        const candidate = resolve(directory.replace(/^"|"$/g, '') || projectPath, executable + extension);
        try { await access(candidate, process.platform === 'win32' ? constants.F_OK : constants.X_OK); } catch { continue; }
        let canonical: string;
        try { canonical = await realpath(candidate); } catch { continue; }
        const paths = [candidate, canonical].map((path) => path.replace(/\\/g, '/').toLowerCase());
        const local = relative(projectPath, candidate);
        if (paths.some((path) => /(?:^|\/)\.ptbk\//.test(path)) || (!local.startsWith(`..${sep}`) && !isAbsolute(local) && paths.some((path) => /\/node_modules\//.test(path)))) {
            return { diagnostic: `The resolved ${executable} is project-local (${candidate}). Install the harness globally and put its global executable first on PATH.` };
        }
        return { path: candidate };
    }
    return { diagnostic: `${executable} was not found on PATH.` };
}

/** Compare bounded semver values, including prereleases; invalid input is never current. @private */
export function compareHarnessVersions(left: string, right: string): number | undefined {
    const parse = (value: string) => /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(value);
    const a = parse(left); const b = parse(right);
    if (!a || !b) return undefined;
    for (let index = 1; index <= 3; index++) { const av = BigInt(a[index]!); const bv = BigInt(b[index]!); if (av !== bv) return av < bv ? -1 : 1; }
    if (a[4] === b[4]) return 0;
    if (!a[4]) return 1;
    if (!b[4]) return -1;
    const aa = a[4].split('.'); const bb = b[4].split('.');
    for (let index = 0; index < Math.max(aa.length, bb.length); index++) {
        const av = aa[index]; const bv = bb[index];
        if (av === bv) continue;
        if (av === undefined) return -1;
        if (bv === undefined) return 1;
        const an = /^\d+$/.test(av); const bn = /^\d+$/.test(bv);
        if (an && bn) return BigInt(av) < BigInt(bv) ? -1 : 1;
        if (an !== bn) return an ? -1 : 1;
        return av < bv ? -1 : 1;
    }
    return 0;
}

/** Preserve actual bounded subprocess diagnostics for installation and registry failures. */
function processDiagnostic(result: Awaited<ReturnType<typeof runProcess>>): string {
    return result.spawnError || result.output.trim() || `Command exited with ${result.exitCode ?? result.signal ?? 'unknown status'}.`;
}

/** Determine whether npm can replace this exact global installation, rather than a private copy. */
async function npmInstallation(definition: HarnessDefinition, current: NativeInspection, projectPath: string, signal?: AbortSignal): Promise<{ supported: boolean; diagnostic: string }> {
    const result = await runProcess(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['root', '--global'], { cwd: homedir(), signal, timeoutMs: 15_000, maxOutputBytes: 32_000, redactionPath: projectPath });
    if (result.exitCode !== 0 || result.spawnError) return { supported: false, diagnostic: `Cannot resolve the global npm installation: ${processDiagnostic(result)}` };
    const root = result.output.trim().split(/\r?\n/).at(-1);
    if (!root || !isAbsolute(root) || !current.executablePath) return { supported: false, diagnostic: 'npm did not report an absolute global module directory. Repair the global npm installation or update this harness with its native installer.' };
    let executable: string; let packageDirectory: string;
    try { const command = await resolveProcessCommand(current.executablePath, [], projectPath); executable = await realpath(command.command === process.execPath && command.args[0] ? command.args[0] : current.executablePath); packageDirectory = await realpath(resolve(root, definition.packageName)); }
    catch { return { supported: false, diagnostic: `${definition.displayName} is installed outside the selected global npm installation. Update it with its native installation mechanism; Promptbook will not install a replacement in the project.` }; }
    const subpath = relative(packageDirectory, executable);
    return !subpath.startsWith(`..${sep}`) && !isAbsolute(subpath) ? { supported: true, diagnostic: 'Resolved the selected global npm installation.' } : { supported: false, diagnostic: `${definition.displayName} executable does not belong to the selected global npm package. Use its native updater or correct PATH before updating.` };
}

/** Supply all common operations while preserving provider-owned configuration and execution. @private */
export function createHarnessPlugin(definition: HarnessDefinition, hooks: NativeHooks): HarnessPlugin {
    /** Map explicit non-secret references into a private subprocess environment. */
    async function configureEnvironment(projectPath: string, configuration: HarnessConfiguration | undefined, env: NodeJS.ProcessEnv): Promise<void> {
        if (!configuration) return;
        if (configuration.apiKeyEnv !== undefined) {
            if (!definition.apiKeyEnvironment) throw new Error(`${definition.displayName} does not support apiKeyEnv references; configure credentials with its native setup (${definition.login}) instead.`);
            if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(configuration.apiKeyEnv)) throw new Error(`${definition.displayName} apiKeyEnv must name an environment variable, never contain a key value.`);
            const key = env[configuration.apiKeyEnv];
            if (!key) throw new Error(`${definition.displayName} requires the configured environment variable ${configuration.apiKeyEnv}; supply it before use.`);
            env[definition.apiKeyEnvironment] = key;
        }
        if (configuration.configurationPath !== undefined) {
            if (!definition.configurationEnvironment) throw new Error(`${definition.displayName} does not support configurationPath references; use its native global configuration instead.`);
            const path = resolve(projectPath, configuration.configurationPath);
            let attributes;
            try { attributes = await stat(path); } catch { throw new Error(`${definition.displayName} native configuration file is unavailable: ${path}. Correct configurationPath before use.`); }
            if (!attributes.isFile()) throw new Error(`${definition.displayName} configurationPath must reference a native configuration file: ${path}.`);
            env[definition.configurationEnvironment] = path;
        }
    }

    /** Resolve installation and native readiness without login, paid inference or mutation. */
    async function inspect(projectPath: string, options: InspectionOptions = {}): Promise<NativeInspection> {
        const base: NativeInspection = { name: definition.name, executable: definition.executable, installed: false, authenticated: false, configured: true, usable: false, authentication: 'none', models: [], thinkingLevels: [...definition.thinkingLevels], capabilities: { team: !!definition.toolDiscovery && !!definition.readOnlyTools, readOnly: !!definition.readOnlyTools }, diagnostic: '', install: definition.install, login: definition.login };
        const resolved = await discoverGlobalExecutable(definition.executable, projectPath);
        if (!resolved.path) return { ...base, diagnostic: `${resolved.diagnostic} Install: ${definition.install}` };
        const version = await runProcess(resolved.path, ['--version'], { cwd: projectPath, signal: options.signal, timeoutMs: 10_000, maxOutputBytes: 32_000 });
        const reportedVersion = /\b\d+\.\d+\.\d+(?:[-+][\w.-]+)?\b/.exec(version.output)?.[0];
        if (version.exitCode !== 0 || version.spawnError || !reportedVersion) return { ...base, diagnostic: version.spawnError || `${definition.executable} did not report a CLI version. Install: ${definition.install}` };
        base.installed = true; base.version = reportedVersion; base.executablePath = resolved.path; base.authentication = 'unknown';
        const env = { ...process.env };
        try { await configureEnvironment(projectPath, options.configuration || options.harnessSettings?.[definition.id], env); }
        catch (error) { return { ...base, configured: false, diagnostic: redactSecrets((error as Error).message, projectPath) }; }
        try {
            await hooks.inspectNative(base, { projectPath, signal: options.signal, home: options.homePath || homedir(), env, probe: (args) => runProcess(resolved.path!, args, { cwd: projectPath, env, signal: options.signal, timeoutMs: 15_000, maxOutputBytes: 128_000 }) });
        } catch (error) { return { ...base, authenticated: false, usable: false, authentication: 'unknown', diagnostic: `Native readiness probe failed: ${redactSecrets((error as Error).message, projectPath)}. Check ${definition.login}.` }; }
        base.usable = base.installed && base.authenticated;
        if (!base.authenticated && base.authentication !== 'unknown') base.authentication = 'none';
        base.diagnostic = base.usable ? `Authenticated ${base.authentication} configuration detected; provider verifies authorization at execution. Model catalog ${base.models.length ? 'reported by installed adapter' : 'unknown; native default retained'}.` : `Installed but signed out or authentication could not be verified. Login: ${definition.login}`;
        return base;
    }
    /** Perform one global npm operation, never writing dependencies under the selected project. */
    async function install(projectPath: string, version: string | undefined, options: InspectionOptions & { onOutput?: (text: string) => void } = {}): Promise<HarnessOperationResult> {
        const result = await runProcess(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install', '--global', `${definition.packageName}${version ? `@${version}` : ''}`], { cwd: homedir(), redactionPath: projectPath, signal: options.signal, timeoutMs: 300_000, onOutput: options.onOutput, maxOutputBytes: 256_000 });
        if (result.cancelled) return { name: definition.name, outcome: 'cancelled', diagnostic: processDiagnostic(result) };
        if (result.exitCode !== 0 || result.spawnError) return { name: definition.name, outcome: 'failed', diagnostic: processDiagnostic(result) };
        const readiness = await inspect(projectPath, options);
        if (!readiness.installed || version && compareHarnessVersions(readiness.version || '', version) !== 0) return { name: definition.name, outcome: 'failed', diagnostic: `Global installation command completed but the resolved executable did not verify ${version || 'an installed version'}: ${readiness.diagnostic}`, version: readiness.version };
        return { name: definition.name, outcome: version ? 'updated' : 'installed', version: readiness.version, diagnostic: `Verified global ${definition.displayName} ${readiness.version}. ${readiness.diagnostic}` };
    }
    /** Run the native account chooser only when setup explicitly authorizes interactive login. */
    async function setupNative(projectPath: string, options: InspectionOptions = {}): Promise<HarnessOperationResult> {
        const current = await inspect(projectPath, options);
        if (current.usable) return { name: definition.name, outcome: 'installed', version: current.version, diagnostic: 'Existing native login/configuration is ready; setup was reused.' };
        if (!current.installed || current.configured === false) return { name: definition.name, outcome: 'failed', diagnostic: current.diagnostic };
        if (options.signal?.aborted) return { name: definition.name, outcome: 'cancelled', diagnostic: 'Native setup cancelled before startup.' };
        const env = { ...process.env };
        await configureEnvironment(projectPath, options.configuration || options.harnessSettings?.[definition.id], env);
        const releaseUsage = await acquireHarnessUsage(definition.id, options);
        try {
            const executable = await resolveProcessCommand(current.executablePath || definition.executable, [...definition.loginArgs], projectPath, env);
            const result = await new Promise<{ code: number | null; error?: string }>((accept) => {
                const child = spawn(executable.command, executable.args, { cwd: projectPath, env, shell: false, stdio: 'inherit' });
                const cancel = () => { child.kill('SIGTERM'); };
                options.signal?.addEventListener('abort', cancel, { once: true });
                child.once('error', (error) => { options.signal?.removeEventListener('abort', cancel); accept({ code: null, error: error.message }); });
                child.once('exit', (code) => { options.signal?.removeEventListener('abort', cancel); accept({ code }); });
            });
            const readiness = await inspect(projectPath, options);
            return { name: definition.name, outcome: options.signal?.aborted ? 'cancelled' : result.code === 0 && readiness.usable ? 'installed' : 'failed', version: readiness.version, diagnostic: result.error || (readiness.usable ? 'Verified native login readiness.' : `Native login exited with ${result.code ?? 'a signal'}; ${readiness.diagnostic}`) };
        } finally { await releaseUsage(); }
    }
    return {
        definition, inspect,
        installGlobal: async (projectPath, options = {}) => withHarnessUpdate(definition.id, () => install(projectPath, undefined, options), options),
        setupNative,
        checkVersion: async (projectPath, current, options = {}) => {
            if (!current.installed) return { name: definition.name, outcome: 'missing', diagnostic: current.diagnostic };
            const result = await runProcess(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['view', definition.packageName, 'version', '--json', '--registry=https://registry.npmjs.org/'], { cwd: homedir(), redactionPath: projectPath, signal: options.signal, timeoutMs: 15_000, maxOutputBytes: 32_000 });
            let latest: unknown;
            try { latest = JSON.parse(result.output); } catch { /* Unknown, never presumed current. */ }
            if (result.exitCode !== 0 || result.spawnError || typeof latest !== 'string' || compareHarnessVersions(current.version || '', latest) === undefined) return { name: definition.name, outcome: 'unknown', currentVersion: current.version, diagnostic: `Latest global version is unknown: ${processDiagnostic(result)}` };
            return { name: definition.name, outcome: compareHarnessVersions(current.version!, latest)! < 0 ? 'outdated' : 'current', currentVersion: current.version, latestVersion: latest, diagnostic: `Global ${definition.displayName}: installed ${current.version}, latest ${latest}.` };
        },
        updateGlobal: async (projectPath, check, options = {}) => {
            if (!check.latestVersion || check.outcome !== 'outdated') return { name: definition.name, outcome: 'unsupported', diagnostic: 'No verified newer version is available. Check the global version before requesting an update.' };
            return withHarnessUpdate(definition.id, async () => {
                const current = await inspect(projectPath, options);
                if (!current.installed) return { name: definition.name, outcome: 'failed', diagnostic: current.diagnostic };
                if (compareHarnessVersions(current.version || '', check.latestVersion!)! >= 0) return { name: definition.name, outcome: 'updated', version: current.version, diagnostic: `Global installation already contains ${current.version}; verified readiness. ${current.diagnostic}` };
                const installation = await npmInstallation(definition, current, projectPath, options.signal);
                if (!installation.supported) return { name: definition.name, outcome: 'unsupported', version: current.version, diagnostic: installation.diagnostic };
                return install(projectPath, check.latestVersion, options);
            }, options);
        },
        configure: (request, env) => configureEnvironment(request.projectPath, request.harnessConfiguration, env),
        version: async (request) => {
            const installation = await discoverGlobalExecutable(definition.executable, request.projectPath);
            if (!installation.path) return undefined;
            const response = await runProcess(installation.path, ['--version'], { cwd: request.projectPath, signal: request.signal, timeoutMs: 10_000, maxOutputBytes: 32_000 });
            return response.exitCode === 0 && !response.spawnError ? /\b\d+\.\d+\.\d+(?:[-+][\w.-]+)?\b/.exec(response.output)?.[0] : undefined;
        },
        help: async (request) => {
            const installation = await discoverGlobalExecutable(definition.executable, request.projectPath);
            if (!installation.path) throw new Error(`${definition.name} setup failed: ${installation.diagnostic} Install: ${definition.install}`);
            const response = await runProcess(installation.path, [...definition.helpArgs], { cwd: request.projectPath, signal: request.signal, timeoutMs: 15_000 });
            if (response.spawnError || response.exitCode !== 0) throw new Error(`${definition.name} setup failed: ${response.spawnError || response.output}. Install: ${definition.install}; login: ${definition.login}`);
            return response.output;
        },
        authenticate: hooks.authenticate || (async () => 'unknown'), prepare: hooks.prepare,
        execute: async (input) => {
            if (input.bridge && hooks.executeWithTools) return hooks.executeWithTools({ ...input, bridge: input.bridge });
            return runProcess(definition.executable, input.command.args, { cwd: input.command.cwd, redactionPath: input.request.redactionPath || input.request.projectPath, env: input.env, input: input.command.input, redactionSecrets: input.command.redactionSecrets, signal: input.request.signal, onOutput: input.request.onOutput, timeoutMs: input.request.timeoutMs, maxOutputBytes: input.request.maxOutputBytes });
        },
    };
}
