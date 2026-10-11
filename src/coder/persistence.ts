import { execFile } from 'node:child_process';
import { mkdir, writeFile, rm, open } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import type { Workspace } from './domain.js';
import { confinePath } from './workspace.js';

/** Execute only scoped operating-system service-manager commands. */
const execute = promisify(execFile);
/** Startup registration always pins the project and installed Node/runtime paths. @private */
export interface StartupPaths { node: string; worker: string; configuration: string; }
/** A reviewable OS registration with bounded commands and no shell interpolation. @private */
export interface StartupRegistration { name: string; path: string; content: string; platform: NodeJS.Platform; prerequisite: string; }
/** Inject a service manager for offline registration validation without installing an actual OS service. @private */
export interface StartupManagerOptions { platform?: NodeJS.Platform; home?: string; invoke?: (command: string, args: string[], options: { timeout: number; maxBuffer?: number }) => Promise<unknown>; }

/** Escape XML text used by launchd and Windows Task Scheduler. */
function xml(text: string): string { return text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]!)); }
/** Quote a systemd argument; literal percent signs must survive unit specifier expansion. */
function systemd(text: string, environmentExpansion = false): string {
    if (/[\r\n\0]/.test(text)) throw new Error('Startup paths must not contain newlines or null bytes.');
    const escaped = text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/%/g, '%%');
    return `"${environmentExpansion ? escaped.replace(/\$/g, () => '$$') : escaped}"`;
}

/** Build a registration without installing it, suitable for offline preview and fixtures. @private */
export function startupRegistration(workspace: Workspace, paths: StartupPaths, platform = process.platform, home = homedir()): StartupRegistration {
    for (const value of [workspace.projectPath, workspace.statePath, paths.node, paths.worker, paths.configuration, home]) {
        if (!value || /[\r\n\0]/.test(value)) throw new Error('Startup paths must be nonempty and must not contain newlines or null bytes.');
    }
    const key = createHash('sha256').update(workspace.projectPath).digest('hex').slice(0, 20);
    const name = `ptbk-${key}`;
    const log = join(workspace.statePath, 'service.log');
    if (platform === 'linux') return {
        name: `${name}.service`, platform, path: join(home, '.config', 'systemd', 'user', `${name}.service`),
        prerequisite: 'A running systemd user manager is required. Automatic start before user login additionally requires user lingering (loginctl enable-linger).',
        content: `[Unit]\nDescription=Promptbook project agenda\nAfter=network.target\n\n[Service]\nType=simple\nWorkingDirectory=${systemd(workspace.projectPath)}\nExecStart=${[paths.node, paths.worker, '--config', paths.configuration, '--resume'].map(value => systemd(value, true)).join(' ')}\nStandardOutput=append:${log.replace(/%/g, '%%')}\nStandardError=append:${log.replace(/%/g, '%%')}\nRestart=on-failure\nRestartSec=10\nTimeoutStopSec=30\n\n[Install]\nWantedBy=default.target\n`,
    };
    if (platform === 'darwin') return {
        name: `io.ptbk.${key}`, platform, path: join(home, 'Library', 'LaunchAgents', `io.ptbk.${key}.plist`),
        prerequisite: 'The current user launchd domain must be available. LaunchAgent startup resumes when that user logs in.',
        content: `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Label</key><string>io.ptbk.${key}</string><key>ProgramArguments</key><array>${[paths.node, paths.worker, '--config', paths.configuration, '--resume'].map(value => `<string>${xml(value)}</string>`).join('')}</array><key>WorkingDirectory</key><string>${xml(workspace.projectPath)}</string><key>RunAtLoad</key><true/><key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict><key>ThrottleInterval</key><integer>10</integer><key>StandardOutPath</key><string>${xml(log)}</string><key>StandardErrorPath</key><string>${xml(log)}</string></dict></plist>\n`,
    };
    if (platform === 'win32') return {
        name, platform, path: join(workspace.statePath, 'startup-task.xml'),
        prerequisite: 'Permission to register a current-user Task Scheduler logon task is required; startup resumes at user login.',
        content: `<?xml version="1.0" encoding="UTF-16"?><Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task"><Triggers><LogonTrigger><Enabled>true</Enabled></LogonTrigger></Triggers><Principals><Principal id="Author"><UserId>${xml(`${process.env.USERDOMAIN || '.'}\\${process.env.USERNAME || ''}`)}</UserId><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals><Settings><MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy><StartWhenAvailable>true</StartWhenAvailable><ExecutionTimeLimit>PT0S</ExecutionTimeLimit><RestartOnFailure><Interval>PT1M</Interval><Count>999</Count></RestartOnFailure></Settings><Actions Context="Author"><Exec><Command>${xml(paths.node)}</Command><Arguments>${xml(`"${paths.worker}" --config "${paths.configuration}" --resume`)}</Arguments><WorkingDirectory>${xml(workspace.projectPath)}</WorkingDirectory></Exec></Actions></Task>\n`,
    };
    throw new Error(`Automatic startup persistence is unsupported on ${platform}. Use --no-persist for an explicit nonpersistent daemon.`);
}

/** Determine a usable launchd domain without assuming a desktop session. */
async function launchDomain(invoke: NonNullable<StartupManagerOptions['invoke']> = execute): Promise<string> {
    const uid = process.getuid?.();
    for (const domain of [`gui/${uid}`, `user/${uid}`]) {
        try { await invoke('launchctl', ['print', domain], { timeout: 10_000, maxBuffer: 4 * 1024 * 1024 }); return domain; } catch { /* Try the headless user domain next. */ }
    }
    throw new Error('No launchd user domain is available. Log into this user session or use --no-persist.');
}

/** Install and start the project through its OS manager, which owns crash restarts. @private */
export async function installStartup(workspace: Workspace, paths: StartupPaths, options: StartupManagerOptions = {}): Promise<StartupRegistration> {
    const registration = startupRegistration(workspace, paths, options.platform, options.home);
    const invoke = options.invoke || execute;
    const statePath = await confinePath(workspace.projectPath, workspace.statePath);
    await mkdir(statePath, { recursive: true, mode: 0o700 });
    const log = await open(await confinePath(workspace.projectPath, join(statePath, 'service.log')), 'a', 0o600);
    await log.close();
    await mkdir(dirname(registration.path), { recursive: true });
    const content = registration.platform === 'win32' ? Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(registration.content, 'utf16le')]) : registration.content;
    await writeFile(registration.path, content, { mode: 0o600 });
    try {
        if (registration.platform === 'linux') {
            await invoke('systemctl', ['--user', 'daemon-reload'], { timeout: 15_000 });
            await invoke('systemctl', ['--user', 'enable', '--now', registration.name], { timeout: 20_000 });
        } else if (registration.platform === 'darwin') {
            const domain = await launchDomain(invoke);
            await invoke('launchctl', ['enable', `${domain}/${registration.name}`], { timeout: 10_000 });
            let loaded = false;
            try { await invoke('launchctl', ['print', `${domain}/${registration.name}`], { timeout: 10_000 }); loaded = true; } catch { /* New registration. */ }
            if (!loaded) await invoke('launchctl', ['bootstrap', domain, registration.path], { timeout: 15_000 });
            else await invoke('launchctl', ['kickstart', `${domain}/${registration.name}`], { timeout: 15_000 });
        } else {
            await invoke('schtasks.exe', ['/Create', '/TN', registration.name, '/XML', registration.path, '/F'], { timeout: 15_000 });
            await invoke('schtasks.exe', ['/Run', '/TN', registration.name], { timeout: 15_000 });
        }
    } catch (error) {
        throw new Error(`Could not establish startup persistence: ${(error as Error).message}. ${registration.prerequisite} No persistent startup was reported; retry setup or explicitly use --no-persist.`);
    }
    return registration;
}

/** Disable only this project's startup entry after a deliberate stop. @private */
export async function disableStartup(workspace: Workspace, paths: StartupPaths, options: StartupManagerOptions = {}): Promise<void> {
    const registration = startupRegistration(workspace, paths, options.platform, options.home);
    const invoke = options.invoke || execute;
    if (registration.platform === 'linux') await invoke('systemctl', ['--user', 'disable', registration.name], { timeout: 15_000 });
    else if (registration.platform === 'darwin') await invoke('launchctl', ['disable', `${await launchDomain(invoke)}/${registration.name}`], { timeout: 15_000 });
    else await invoke('schtasks.exe', ['/Change', '/TN', registration.name, '/DISABLE'], { timeout: 15_000 });
}

/** Remove only the registration owned by the selected project; never remove its runtime data. @private */
export async function removeStartup(workspace: Workspace, paths: StartupPaths, options: StartupManagerOptions = {}): Promise<void> {
    const registration = startupRegistration(workspace, paths, options.platform, options.home);
    const invoke = options.invoke || execute;
    await disableStartup(workspace, paths, options);
    if (registration.platform === 'linux') await invoke('systemctl', ['--user', 'stop', registration.name], { timeout: 20_000 });
    else if (registration.platform === 'darwin') {
        try { await invoke('launchctl', ['bootout', `${await launchDomain(invoke)}/${registration.name}`], { timeout: 20_000 }); }
        catch (error) { if (!/could not find service|no such process|service not found/i.test(String((error as { stderr?: string }).stderr || error))) throw error; }
    } else await invoke('schtasks.exe', ['/Delete', '/TN', registration.name, '/F'], { timeout: 15_000 });
    await rm(registration.path, { force: true });
    if (registration.platform === 'linux') await invoke('systemctl', ['--user', 'daemon-reload'], { timeout: 15_000 });
}
