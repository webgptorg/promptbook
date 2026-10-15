import { rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { ensureDirectory, pathExists, readTextIfExists } from '../common/fs.js';
import { shortHash } from '../common/ids.js';
import { runProcess } from '../common/process.js';
import { ENGINE_ROOT } from '../common/version.js';
import type { Project } from '../project/workspace.js';

/**
 * Outcome of establishing startup persistence.
 *
 * @private startup persistence
 */
export type PersistenceOutcome = { readonly persistent: boolean; readonly note: string; readonly location?: string };

/**
 * Stable per-project registration name.
 */
function registrationName(project: Project): string {
    return `ptbk-agenda-${shortHash(project.root, 12)}`;
}

/**
 * Escapes text for XML.
 */
function xml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Command that resumes the project's service after login/boot (idempotent, never prompts).
 */
function resumeCommand(project: Project, nodePath: string): string[] {
    return [nodePath, join(ENGINE_ROOT, 'bin', 'ptbk.js'), 'start', '--resume-service', '--non-interactive', '--raw', '--path', project.root];
}

/**
 * Writes a file only when its content changes (repeated starts do not duplicate registrations).
 */
async function writeIfChanged(path: string, content: string): Promise<boolean> {
    if ((await readTextIfExists(path)) === content) return false;
    await writeFile(path, content);
    return true;
}

/**
 * Registers automatic startup of the project's service at login/boot for the current user.
 *
 * Reports honestly when persistence cannot be established.
 *
 * @private startup persistence
 */
export async function registerPersistence(project: Project, nodePath: string, path: string): Promise<PersistenceOutcome> {
    const name = registrationName(project);
    const command = resumeCommand(project, nodePath);
    try {
        if (process.platform === 'darwin') {
            const directory = await ensureDirectory(join(homedir(), 'Library', 'LaunchAgents'));
            const file = join(directory, `io.ptbk.${name}.plist`);
            const content = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key><string>io.ptbk.${name}</string>
    <key>ProgramArguments</key>
    <array>
${command.map((argument) => `        <string>${xml(argument)}</string>`).join('\n')}
    </array>
    <key>RunAtLoad</key><true/>
    <key>WorkingDirectory</key><string>${xml(project.root)}</string>
    <key>EnvironmentVariables</key><dict><key>PATH</key><string>${xml(path)}</string></dict>
    <key>StandardOutPath</key><string>${xml(join(project.runtime.service, 'login-start.log'))}</string>
    <key>StandardErrorPath</key><string>${xml(join(project.runtime.service, 'login-start.log'))}</string>
</dict>
</plist>
`;
            await writeIfChanged(file, content);
            return { persistent: true, note: 'Restarts after crashes and at login (LaunchAgent).', location: file };
        }
        if (process.platform === 'win32') {
            const startup = join(process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
            await ensureDirectory(startup);
            const file = join(startup, `${name}.vbs`);
            const line = command.map((argument) => `""${argument.replace(/"/g, '')}""`).join(' ');
            const content = `' Promptbook agenda for ${project.root.replace(/\r?\n/g, ' ')}\r\nSet shell = CreateObject("WScript.Shell")\r\nshell.CurrentDirectory = "${project.root.replace(/"/g, '')}"\r\nshell.Run "${line}", 0, False\r\n`;
            await writeIfChanged(file, content);
            return { persistent: true, note: 'Restarts after crashes and at sign-in (Startup folder).', location: file };
        }
        const systemd = await runProcess('systemctl', ['--user', 'show-environment'], { cwd: project.root, timeoutMs: 10_000 });
        if (systemd.exitCode === 0) {
            const directory = await ensureDirectory(join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'systemd', 'user'));
            const file = join(directory, `${name}.service`);
            const quote = (argument: string): string => `"${argument.replace(/(["\\])/g, '\\$1')}"`;
            const content = `[Unit]\nDescription=Promptbook agenda for ${project.root}\nAfter=network-online.target\n\n[Service]\nType=oneshot\nRemainAfterExit=yes\nWorkingDirectory=${project.root}\nEnvironment=${quote(`PATH=${path}`)}\nExecStart=${command.map(quote).join(' ')}\n\n[Install]\nWantedBy=default.target\n`;
            if (await writeIfChanged(file, content)) await runProcess('systemctl', ['--user', 'daemon-reload'], { cwd: project.root, timeoutMs: 20_000 });
            const enabled = await runProcess('systemctl', ['--user', 'enable', `${name}.service`], { cwd: project.root, timeoutMs: 20_000 });
            if (enabled.exitCode !== 0) return { persistent: false, note: `Restarts after crashes, but startup registration failed: ${enabled.stderr.trim()}`, location: file };
            const linger = await runProcess('loginctl', ['show-user', process.env.USER ?? '', '--property=Linger'], { cwd: project.root, timeoutMs: 10_000 });
            const note = /Linger=yes/.test(linger.stdout) ? 'Restarts after crashes and at boot (systemd user unit with lingering).' : 'Restarts after crashes and at login (systemd user unit). For boot without login run `loginctl enable-linger`.';
            return { persistent: true, note, location: file };
        }
        const autostart = await ensureDirectory(join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'autostart'));
        const file = join(autostart, `${name}.desktop`);
        const exec = command.map((argument) => (/\s/.test(argument) ? `"${argument}"` : argument)).join(' ');
        await writeIfChanged(file, `[Desktop Entry]\nType=Application\nName=Promptbook agenda\nExec=${exec}\nX-GNOME-Autostart-enabled=true\nNoDisplay=true\n`);
        return { persistent: true, note: 'Restarts after crashes and at desktop login (XDG autostart; no systemd user session found).', location: file };
    } catch (error) {
        return { persistent: false, note: `Startup persistence could not be installed: ${(error as Error).message}. The service still restarts after crashes while this login session lasts.` };
    }
}

/**
 * Removes the project's startup registration (intentional stop or --no-persist).
 *
 * @private startup persistence
 */
export async function unregisterPersistence(project: Project): Promise<void> {
    const name = registrationName(project);
    const candidates =
        process.platform === 'darwin'
            ? [join(homedir(), 'Library', 'LaunchAgents', `io.ptbk.${name}.plist`)]
            : process.platform === 'win32'
              ? [join(process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', `${name}.vbs`)]
              : [join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'systemd', 'user', `${name}.service`), join(process.env.XDG_CONFIG_HOME ?? join(homedir(), '.config'), 'autostart', `${name}.desktop`)];
    for (const file of candidates) {
        if (!(await pathExists(file))) continue;
        if (file.endsWith('.service')) await runProcess('systemctl', ['--user', 'disable', `${name}.service`], { cwd: project.root, timeoutMs: 20_000 });
        await rm(file, { force: true });
    }
}
