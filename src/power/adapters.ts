import { spawn, type ChildProcess } from 'node:child_process';
import { closeSync, openSync } from 'node:fs';
import { access, readdir, readFile } from 'node:fs/promises';
import { release as osRelease } from 'node:os';
import { join } from 'node:path';
import { errorMessage } from '../common/errors.js';
import { killVerifiedProcess, runProcess, verifyRecordedProcess, which } from '../common/process.js';
import { LID_HELPER_PATH, verifyLidHelper } from './mac-lid-helper.js';
import type { PowerSource } from './view.js';

/**
 * One kind of OS power request: idle-sleep protection, or keeping a closed-lid laptop awake.
 *
 * @private keep-awake adapters
 */
export type HoldKind = 'idle' | 'lid';

/**
 * What the host reports about its power source.
 *
 * @private keep-awake adapters
 */
export type PowerReading = { readonly source: PowerSource; readonly detail?: string };

/**
 * Whether the host can provide a kind of protection (`approval`: only after local administrator approval).
 *
 * @private keep-awake adapters
 */
export type PowerCapability = { readonly state: 'available' | 'approval' | 'unavailable'; readonly reason?: string; readonly validation?: { readonly validated: boolean; readonly text: string } };

/**
 * What the OS reports about lid closure right now (fields are absent when unknown).
 *
 * @private keep-awake adapters
 */
export type LidObservation = { readonly hasLid?: boolean; readonly lidClosed?: boolean; readonly sleepsOnClose?: boolean; readonly sleepDisabled?: boolean };

/**
 * A live, verified OS power request owned by this engine process. It ends with the process (crash, force stop, PID
 * reuse cannot leave it behind) and `ended` settles when it ended without `release()`.
 *
 * @private keep-awake adapters
 */
export type PowerHold = {
    readonly kind: HoldKind;
    readonly ended: Promise<string>;
    readonly release: () => Promise<void>;
};

/**
 * A detached, bounded process carrying a request through a restart/update handoff (it ends by itself at its deadline).
 *
 * @private keep-awake adapters
 */
export type CarrierRecord = { readonly pid: number; readonly startedAt: string; readonly kind: HoldKind };

/**
 * Platform operations of the keep-awake controller.
 *
 * @private keep-awake adapters
 */
export type PowerAdapter = {
    /** Platform shown on the System page. */
    readonly platform: string;
    /** Power-source polling interval while keep-awake is enabled. */
    readonly pollMs: number;
    host(): Promise<{ readonly model?: string; readonly os?: string }>;
    readPower(): Promise<PowerReading>;
    idleCapability(): Promise<PowerCapability>;
    lidCapability(): Promise<PowerCapability>;
    /** Acquires and verifies a request; rejects with the reason when the OS does not confirm it. */
    hold(kind: HoldKind, why: string): Promise<PowerHold>;
    observeLid(): Promise<LidObservation | undefined>;
    /** Starts detached carriers holding `kinds` for at most `seconds`, once each is verified. */
    carry(kinds: readonly HoldKind[], seconds: number, directory: string): Promise<CarrierRecord[]>;
    /** Why `kinds` could not be carried through a restart now (undefined when they can). */
    carryProblem(kinds: readonly HoldKind[]): Promise<string | undefined>;
};

/**
 * Model/OS combinations on which closed-lid operation without an external display was verified on physical hardware
 * (`scripts/keep-awake-hardware-check.mjs`). An idle assertion or an administrator approval alone is never evidence.
 *
 * @private keep-awake adapters
 */
export const CLOSED_LID_VALIDATED: ReadonlyArray<{ readonly model: string; readonly macos: string; readonly checkedAt: string }> = [];

/**
 * How long acquiring and verifying one request may take.
 */
const HOLD_TIMEOUT_MS = 20_000;

/**
 * Interval between verification attempts of a new request, and how many are made.
 */
const VERIFY_INTERVAL_MS = 250;

/**
 * Interval at which a starting carrier's confirmation is looked for.
 */
const CARRIER_POLL_MS = 150;

/**
 * Owner-only permissions of a carrier's log.
 */
const LOG_MODE = 0o600;

/**
 * Longest PowerShell query (its startup alone can take seconds on a busy host).
 */
const POWERSHELL_QUERY_MS = 20_000;

/**
 * Bounded text kept from a helper's diagnostics.
 */
const MAX_DIAGNOSTICS = 2000;

/**
 * Options of a helper-process request.
 */
type HoldProcessOptions = {
    readonly env: NodeJS.ProcessEnv;
    /** The helper prints this line once the OS confirmed the request (a `failed: …` line is a refusal). */
    readonly readyLine?: string;
    /** Verifies the request after start; returns undefined once the OS confirms it, otherwise why not (retried). */
    readonly verify?: (child: ChildProcess) => Promise<string | undefined>;
    /** `stdin`: ends when its input closes; `signal`: ends on SIGTERM. */
    readonly release: 'stdin' | 'signal';
    /** A new session without a controlling terminal (sudo then never allocates a pseudo-terminal). */
    readonly detached?: boolean;
};

/**
 * Waits for a child to exit, bounded.
 */
async function exited(child: ChildProcess, timeoutMs: number): Promise<boolean> {
    if (child.exitCode !== null || child.signalCode !== null) return true;
    return await new Promise<boolean>((resolve) => {
        // A referenced, bounded timer: the process stays alive until the request is observed to end.
        const timer = setTimeout(() => resolve(false), timeoutMs);
        child.once('exit', () => {
            clearTimeout(timer);
            resolve(true);
        });
    });
}

/**
 * Starts a helper process that holds an OS request for exactly its own lifetime and resolves once it is verified.
 */
async function holdProcess(kind: HoldKind, command: string, args: readonly string[], options: HoldProcessOptions): Promise<PowerHold> {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], env: options.env, windowsHide: true, detached: options.detached === true });
    let diagnostics = '';
    let stdoutBuffer = '';
    let ready = false;
    let releasing = false;
    const lines: Array<(line: string) => void> = [];
    child.stdin?.on('error', () => undefined);
    child.stdout?.setEncoding('utf8').on('data', (chunk: string) => {
        stdoutBuffer += chunk;
        const parts = stdoutBuffer.split(/\r?\n/);
        stdoutBuffer = parts.pop() ?? '';
        for (const line of parts) for (const listener of lines) listener(line.trim());
        diagnostics = `${diagnostics}${chunk}`.slice(-MAX_DIAGNOSTICS);
    });
    child.stderr?.setEncoding('utf8').on('data', (chunk: string) => (diagnostics = `${diagnostics}${chunk}`.slice(-MAX_DIAGNOSTICS)));
    const spawnFailure = new Promise<string>((resolve) => child.once('error', (error) => resolve(errorMessage(error))));
    const exit = new Promise<string>((resolve) => child.once('exit', (code, signal) => resolve(`${command.split(/[\\/]/).at(-1)} ended (${signal ?? `exit code ${String(code)}`})${diagnostics.trim() ? `: ${diagnostics.trim().split('\n').at(-1)}` : ''}`)));
    const ended = Promise.race([exit, spawnFailure]);
    const stop = async (): Promise<void> => {
        if (releasing) return;
        releasing = true;
        if (options.release === 'stdin') child.stdin?.end();
        else child.kill('SIGTERM');
        if (await exited(child, 5000)) return;
        child.kill('SIGTERM');
        if (await exited(child, 3000)) return;
        child.kill('SIGKILL');
        await exited(child, 3000);
    };
    try {
        await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(`The OS did not confirm the request within ${HOLD_TIMEOUT_MS / 1000} s.`)), HOLD_TIMEOUT_MS);
            const done = (error?: Error): void => {
                clearTimeout(timer);
                if (error) reject(error);
                else resolve();
            };
            void ended.then((reason) => done(new Error(reason)));
            if (options.readyLine) {
                lines.push((line) => {
                    if (line === options.readyLine) done();
                    else if (line.startsWith('failed')) done(new Error(line.replace(/^failed:?\s*/, '') || 'The helper refused the request.'));
                });
            } else if (options.verify) {
                void (async () => {
                    let last: string | undefined = 'not verified yet';
                    for (let attempt = 0; attempt < 16 && last; attempt++) {
                        await new Promise((wait) => setTimeout(wait, VERIFY_INTERVAL_MS));
                        if (child.exitCode !== null || child.signalCode !== null) return;
                        last = await options.verify!(child).catch((error: unknown) => errorMessage(error));
                    }
                    done(last ? new Error(last) : undefined);
                })();
            } else done();
        });
        if (options.readyLine && options.verify) {
            const problem = await options.verify(child);
            if (problem) throw new Error(problem);
        }
        ready = true;
    } catch (error) {
        await stop();
        throw error;
    }
    child.unref();
    for (const stream of [child.stdin, child.stdout, child.stderr]) (stream as { unref?: () => void } | null)?.unref?.();
    return { kind, ended: ended.then((reason) => (ready && releasing ? 'released' : reason)), release: stop };
}

/**
 * Starts a detached carrier writing its output to `log` and waits until it confirms its request (`held`), or until
 * `verify` confirms it.
 */
async function startCarrier(kind: HoldKind, command: string, args: readonly string[], log: string, env: NodeJS.ProcessEnv, verify?: (pid: number) => Promise<string | undefined>): Promise<CarrierRecord> {
    const fd = openSync(log, 'w', LOG_MODE);
    let child: ChildProcess;
    try {
        child = spawn(command, args, { detached: true, stdio: ['ignore', fd, fd], env, windowsHide: true });
    } finally {
        closeSync(fd);
    }
    const failure = new Promise<string>((resolve) => child.once('error', (error) => resolve(errorMessage(error))));
    const exit = new Promise<string>((resolve) => child.once('exit', (code, signal) => resolve(`the carrier ended (${signal ?? `exit code ${String(code)}`})`)));
    let gone: string | undefined;
    void Promise.race([failure, exit]).then((reason) => (gone = reason));
    child.unref();
    const startedAt = new Date().toISOString();
    const deadline = Date.now() + HOLD_TIMEOUT_MS;
    let problem: string | undefined = 'not confirmed';
    while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, CARRIER_POLL_MS));
        if (gone) {
            problem = `${gone}${(await readFile(log, 'utf8').catch(() => '')).trim() ? `: ${(await readFile(log, 'utf8')).trim().split('\n').at(-1)}` : ''}`;
            break;
        }
        if (verify) {
            problem = await verify(child.pid!).catch((error: unknown) => errorMessage(error));
            if (!problem) break;
            continue;
        }
        const text = await readFile(log, 'utf8').catch(() => '');
        if (/^held\s*$/m.test(text)) {
            problem = undefined;
            break;
        }
        const refused = /^failed:?\s*(.*)$/m.exec(text);
        if (refused) {
            problem = refused[1] || 'the helper refused the request';
            break;
        }
    }
    if (problem) {
        await endCarriers([{ pid: child.pid ?? 0, startedAt, kind }]);
        throw new Error(`The ${kind === 'lid' ? 'closed-lid' : 'idle-sleep'} handoff could not start: ${problem}`);
    }
    return { pid: child.pid!, startedAt, kind };
}

/**
 * Ends carriers whose identity still matches their record (a reused PID is never signalled): their whole process
 * group politely first, then forcibly. Their requests end with them.
 *
 * @private keep-awake adapters
 */
export async function endCarriers(records: readonly CarrierRecord[]): Promise<void> {
    await Promise.all(
        records.map(async (record) => {
            if (!Number.isInteger(record.pid) || record.pid <= 0) return;
            if ((await verifyRecordedProcess(record.pid, record.startedAt)) !== 'verified') return;
            if (process.platform === 'win32') {
                await killVerifiedProcess(record.pid);
                return;
            }
            try {
                process.kill(-record.pid, 'SIGTERM');
            } catch {
                return;
            }
            for (let attempt = 0; attempt < 20; attempt++) {
                await new Promise((resolve) => setTimeout(resolve, 100));
                try {
                    process.kill(-record.pid, 0);
                } catch {
                    return;
                }
            }
            await killVerifiedProcess(record.pid, { group: true });
        }),
    );
}

/**
 * The verified hardware validation of closed-lid operation for this Mac.
 */
function lidValidation(model: string | undefined, os: string | undefined): { readonly validated: boolean; readonly text: string } {
    const major = os?.split('.')[0];
    const entry = CLOSED_LID_VALIDATED.find((item) => item.model === model && item.macos === major);
    if (entry) return { validated: true, text: `Validated with the lid closed and no external display on ${model} with macOS ${major} (${entry.checkedAt}).` };
    return { validated: false, text: `Not yet validated with the lid closed and no external display on ${model ?? 'this Mac'}${os ? ` with macOS ${os}` : ''}: the setting is applied and observed, but closing the lid has not been tested on this model.` };
}

/**
 * Parses `pmset -g ps`.
 *
 * @private keep-awake adapters
 */
export function parseMacPowerSource(text: string): PowerReading {
    const source = /Now drawing from '([^']+)'/.exec(text)?.[1];
    const battery = /InternalBattery[^\t]*\t\s*([^\n]*?)(?:\s+present: \w+)?$/m.exec(text)?.[1]?.trim();
    const detail = [source, battery].filter(Boolean).join(' · ') || undefined;
    if (source === 'AC Power') return { source: 'external', detail };
    if (source === 'Battery Power' || source === 'UPS Power') return { source: 'battery', detail };
    return { source: 'unknown', detail: detail ?? 'macOS did not report its power source.' };
}

/**
 * Whether `pmset -g assertions` lists an idle-sleep assertion of a caffeinate process.
 *
 * @private keep-awake adapters
 */
export function macAssertionHeld(text: string, pid: number): boolean {
    return new RegExp(`\\bpid ${pid}\\(caffeinate\\):[^\\n]*PreventUserIdleSystemSleep`).test(text);
}

/**
 * Parses the lid facts of `ioreg -r -k AppleClamshellState -d 1` and `pmset -g`.
 *
 * @private keep-awake adapters
 */
export function parseMacLid(ioreg: string, pmset: string): LidObservation {
    const value = (key: string): boolean | undefined => {
        const match = new RegExp(`"${key}" = (Yes|No)`).exec(ioreg)?.[1];
        return match === undefined ? undefined : match === 'Yes';
    };
    const lidClosed = value('AppleClamshellState');
    const disabled = /^\s*SleepDisabled\s+(\d)/m.exec(pmset)?.[1];
    return { hasLid: lidClosed !== undefined, lidClosed, sleepsOnClose: value('AppleClamshellCausesSleep'), ...(disabled !== undefined ? { sleepDisabled: disabled === '1' } : {}) };
}

/**
 * Runs a short OS query and returns its stdout (empty on failure).
 */
async function query(command: string, args: readonly string[], env: NodeJS.ProcessEnv, timeoutMs = 10_000): Promise<string> {
    const result = await runProcess(command, args, { cwd: '/', env, timeoutMs }).catch(() => undefined);
    return result?.exitCode === 0 ? result.stdout : '';
}

/**
 * macOS: a process-scoped `caffeinate -i -w <engine PID>` idle assertion verified in `pmset -g assertions`, and the
 * separately approved closed-lid helper.
 */
function macAdapter(env: NodeJS.ProcessEnv): PowerAdapter {
    let host: { model?: string; os?: string } | undefined;
    const readHost = async (): Promise<{ model?: string; os?: string }> => {
        host ??= { model: (await query('/usr/sbin/sysctl', ['-n', 'hw.model'], env)).trim() || undefined, os: (await query('/usr/bin/sw_vers', ['-productVersion'], env)).trim() || undefined };
        return host;
    };
    const observeLid = async (): Promise<LidObservation> => parseMacLid(await query('/usr/sbin/ioreg', ['-r', '-k', 'AppleClamshellState', '-d', '1'], env), await query('/usr/bin/pmset', ['-g'], env));
    const assertionVerifier = async (pid: number): Promise<string | undefined> => (macAssertionHeld(await query('/usr/bin/pmset', ['-g', 'assertions'], env), pid) ? undefined : 'macOS does not list the idle-sleep assertion yet.');
    const lidCapability = async (): Promise<PowerCapability> => {
        const lid = await observeLid();
        if (!lid.hasLid) return { state: 'unavailable', reason: 'This Mac has no built-in lid.' };
        const { model, os } = await readHost();
        const validation = lidValidation(model, os);
        const helper = await verifyLidHelper(env);
        if (helper.state === 'ready') return { state: 'available', validation };
        return { state: helper.state === 'unsafe' ? 'unavailable' : 'approval', reason: helper.reason, validation };
    };
    return {
        platform: 'macOS',
        pollMs: 15_000,
        host: readHost,
        readPower: async () => parseMacPowerSource(await query('/usr/bin/pmset', ['-g', 'ps'], env)),
        idleCapability: async () => ((await access('/usr/bin/caffeinate').then(() => true, () => false)) ? { state: 'available' } : { state: 'unavailable', reason: 'caffeinate is not available on this Mac.' }),
        lidCapability,
        observeLid,
        hold: async (kind) => {
            if (kind === 'idle') return await holdProcess('idle', '/usr/bin/caffeinate', ['-i', '-w', String(process.pid)], { env, release: 'signal', verify: async (child) => await assertionVerifier(child.pid!) });
            return await holdProcess('lid', '/usr/bin/sudo', ['-n', LID_HELPER_PATH, 'hold'], {
                env,
                release: 'stdin',
                detached: true,
                readyLine: 'held',
                verify: async () => ((await observeLid()).sleepDisabled === true ? undefined : 'macOS does not report SleepDisabled after the helper’s hold.'),
            });
        },
        carry: async (kinds, seconds, directory) => {
            const records: CarrierRecord[] = [];
            try {
                for (const kind of kinds) {
                    const log = join(directory, `keep-awake-carrier-${kind}.log`);
                    records.push(
                        kind === 'idle'
                            ? await startCarrier('idle', '/usr/bin/caffeinate', ['-i', '-t', String(seconds)], log, env, assertionVerifier)
                            : await startCarrier('lid', '/bin/sh', ['-c', `sleep ${Math.round(seconds)} | /usr/bin/sudo -n '${LID_HELPER_PATH}' hold`], log, env),
                    );
                }
            } catch (error) {
                await endCarriers(records);
                throw error;
            }
            return records;
        },
        carryProblem: async (kinds) => {
            if (!kinds.includes('lid')) return undefined;
            const helper = await verifyLidHelper(env);
            return helper.state === 'ready' ? undefined : `the closed-lid protection cannot be carried through the restart: ${helper.reason}`;
        },
    };
}

/**
 * PowerShell holding a `PowerRequestSystemRequired` request through `PowerSetRequest` until its input closes (or for a
 * bounded number of seconds); the request ends with the process.
 */
function windowsRequestScript(seconds?: number): string {
    return `$ErrorActionPreference = 'Stop'
try {
    Add-Type -Namespace Ptbk -Name Power -MemberDefinition @'
[StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
public struct REASON_CONTEXT { public uint Version; public uint Flags; [MarshalAs(UnmanagedType.LPWStr)] public string SimpleReasonString; }
[DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)] public static extern IntPtr PowerCreateRequest(ref REASON_CONTEXT Context);
[DllImport("kernel32.dll", SetLastError = true)] public static extern bool PowerSetRequest(IntPtr PowerRequest, int RequestType);
'@
    $context = New-Object 'Ptbk.Power+REASON_CONTEXT'
    $context.Version = 0
    $context.Flags = 1
    $context.SimpleReasonString = 'A Promptbook engine keeps working'
    $request = [Ptbk.Power]::PowerCreateRequest([ref]$context)
    if ($request -eq [IntPtr]::Zero -or $request -eq [IntPtr](-1)) { [Console]::Out.WriteLine('failed: PowerCreateRequest ' + [Runtime.InteropServices.Marshal]::GetLastWin32Error()); exit 1 }
    if (-not [Ptbk.Power]::PowerSetRequest($request, 1)) { [Console]::Out.WriteLine('failed: PowerSetRequest ' + [Runtime.InteropServices.Marshal]::GetLastWin32Error()); exit 1 }
    [Console]::Out.WriteLine('held')
    [Console]::Out.Flush()
    ${seconds === undefined ? '[void][Console]::In.ReadToEnd()' : `Start-Sleep -Seconds ${Math.round(seconds)}`}
} catch {
    [Console]::Out.WriteLine('failed: ' + $_.Exception.Message)
    exit 1
}
`;
}

/**
 * Arguments running a PowerShell script without a profile or prompts.
 */
function powershellArguments(script: string): string[] {
    return ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')];
}

/**
 * Parses the one-line power status printed by the Windows query (`PowerLineStatus|BatteryChargeStatus|percent`).
 *
 * @private keep-awake adapters
 */
export function parseWindowsPowerStatus(text: string): PowerReading {
    const [line, charge, percent] = text.trim().split('|');
    const battery = charge && !/NoSystemBattery/i.test(charge) && percent && Number(percent) >= 0 && Number(percent) <= 100 ? `battery ${percent}%` : undefined;
    if (line === 'Online') return { source: 'external', detail: ['AC power', battery].filter(Boolean).join(' · ') };
    if (line === 'Offline') return { source: 'battery', detail: ['Battery power', battery].filter(Boolean).join(' · ') };
    return { source: 'unknown', detail: 'Windows did not report its power line status.' };
}

/**
 * Windows: a process-owned `PowerRequestSystemRequired` request; closing the lid follows the Windows lid setting.
 */
function windowsAdapter(env: NodeJS.ProcessEnv): PowerAdapter {
    const powershell = async (): Promise<string | undefined> => await which('powershell', env);
    return {
        platform: 'Windows',
        pollMs: 30_000,
        host: async () => ({ os: osRelease() }),
        readPower: async () => {
            const shell = await powershell();
            if (!shell) return { source: 'unknown', detail: 'PowerShell is not available, so the power source is unknown.' };
            const script = `Add-Type -AssemblyName System.Windows.Forms; $s = [System.Windows.Forms.SystemInformation]::PowerStatus; [Console]::Out.WriteLine("$($s.PowerLineStatus)|$($s.BatteryChargeStatus)|$([int]($s.BatteryLifePercent * 100))")`;
            return parseWindowsPowerStatus(await query(shell, powershellArguments(script), env, POWERSHELL_QUERY_MS));
        },
        idleCapability: async () => ((await powershell()) ? { state: 'available' } : { state: 'unavailable', reason: 'PowerShell is not available to hold a Windows power request.' }),
        lidCapability: async () => ({ state: 'unavailable', reason: 'Closing the lid follows the Windows lid setting (Power Options); Promptbook does not change it.' }),
        observeLid: async () => undefined,
        hold: async (kind) => {
            const shell = await powershell();
            if (kind !== 'idle' || !shell) throw new Error(kind === 'idle' ? 'PowerShell is not available.' : 'Closed-lid protection is not available on Windows.');
            return await holdProcess('idle', shell, powershellArguments(windowsRequestScript()), { env, release: 'stdin', readyLine: 'held' });
        },
        carry: async (kinds, seconds, directory) => {
            const shell = await powershell();
            if (!shell) throw new Error('PowerShell is not available.');
            return kinds.includes('idle') ? [await startCarrier('idle', shell, powershellArguments(windowsRequestScript(seconds)), join(directory, 'keep-awake-carrier-idle.log'), env)] : [];
        },
        carryProblem: async () => ((await powershell()) ? undefined : 'PowerShell is not available to carry the power request through the restart.'),
    };
}

/**
 * Reads `/sys/class/power_supply` (`external`: a mains/USB supply online; `battery`: only batteries; `unknown`: no
 * supply reported, as on servers and virtual machines).
 *
 * @private keep-awake adapters
 */
export async function readLinuxPowerSupplies(root = '/sys/class/power_supply'): Promise<PowerReading> {
    const names = await readdir(root).catch(() => [] as string[]);
    const supplies = await Promise.all(
        names.map(async (name) => {
            const read = async (file: string): Promise<string> => (await readFile(join(root, name, file), 'utf8').catch(() => '')).trim();
            return { name, type: await read('type'), online: await read('online'), status: await read('status'), capacity: await read('capacity') };
        }),
    );
    const mains = supplies.filter((supply) => ['Mains', 'USB', 'USB_C', 'USB_PD', 'USB_PD_DRP'].includes(supply.type) && supply.online !== '');
    const batteries = supplies.filter((supply) => supply.type === 'Battery');
    const battery = batteries[0] ? `battery ${batteries[0].capacity ? `${batteries[0].capacity}% ` : ''}${batteries[0].status.toLowerCase()}`.trim() : undefined;
    if (mains.some((supply) => supply.online === '1')) return { source: 'external', detail: ['External power', battery].filter(Boolean).join(' · ') };
    if (mains.length || batteries.some((supply) => supply.status === 'Discharging')) return { source: 'battery', detail: ['Battery power', battery].filter(Boolean).join(' · ') };
    return { source: 'unknown', detail: names.length ? 'The host reports no usable power supply state.' : 'The host reports no power supply (typical for servers and virtual machines).' };
}

/**
 * Linux: a `systemd-inhibit` idle/sleep inhibitor verified in logind's list, where systemd-logind runs; closing the
 * lid follows the host's lid handler.
 */
function linuxAdapter(env: NodeJS.ProcessEnv): PowerAdapter {
    const listed = async (pid: number): Promise<string | undefined> => {
        const list = await query('systemd-inhibit', ['--list', '--no-pager', '--no-legend'], env);
        return list.split('\n').some((line) => line.includes('Promptbook') && new RegExp(`\\b${pid}\\b`).test(line)) ? undefined : 'systemd-logind does not list the inhibitor.';
    };
    const capability = async (): Promise<PowerCapability> => {
        if (!(await which('systemd-inhibit', env))) return { state: 'unavailable', reason: 'systemd-inhibit is not installed, so idle-sleep protection is unsupported on this host.' };
        if (!(await access('/run/systemd/system').then(() => true, () => false))) return { state: 'unavailable', reason: 'systemd is not running, so idle-sleep protection is unsupported on this host.' };
        const list = await runProcess('systemd-inhibit', ['--list', '--no-pager'], { cwd: '/', env, timeoutMs: 10_000 }).catch(() => undefined);
        return list?.exitCode === 0 ? { state: 'available' } : { state: 'unavailable', reason: 'systemd-logind is not reachable, so idle-sleep protection is unsupported in this session.' };
    };
    const inhibit = (why: string, command: readonly string[]): string[] => ['--what=idle:sleep', '--who=Promptbook', `--why=${why}`, '--mode=block', ...command];
    return {
        platform: 'Linux',
        pollMs: 15_000,
        host: async () => ({ os: osRelease() }),
        readPower: async () => await readLinuxPowerSupplies(),
        idleCapability: capability,
        lidCapability: async () => ({ state: 'unavailable', reason: 'Closing the lid follows the host’s lid handler (logind HandleLidSwitch); Promptbook does not change it.' }),
        observeLid: async () => undefined,
        hold: async (kind, why) => {
            if (kind !== 'idle') throw new Error('Closed-lid protection is not available on Linux.');
            return await holdProcess('idle', 'systemd-inhibit', inhibit(why, ['cat']), { env, release: 'stdin', verify: async (child) => await listed(child.pid!) });
        },
        carry: async (kinds, seconds, directory) => (kinds.includes('idle') ? [await startCarrier('idle', 'systemd-inhibit', inhibit('A Promptbook engine restarts', ['sleep', String(Math.round(seconds))]), join(directory, 'keep-awake-carrier-idle.log'), env, listed)] : []),
        carryProblem: async () => {
            const available = await capability();
            return available.state === 'available' ? undefined : available.reason;
        },
    };
}

/**
 * A host without a supported mechanism: nothing is ever reported as active.
 */
function unsupportedAdapter(platform: string, reason: string): PowerAdapter {
    return {
        platform,
        pollMs: 300_000,
        host: async () => ({}),
        readPower: async () => ({ source: 'unknown', detail: reason }),
        idleCapability: async () => ({ state: 'unavailable', reason }),
        lidCapability: async () => ({ state: 'unavailable', reason }),
        observeLid: async () => undefined,
        hold: async () => {
            throw new Error(reason);
        },
        carry: async () => [],
        carryProblem: async () => reason,
    };
}

/**
 * The fixture host's state file (`PTBK_POWER_FAKE/power.json`).
 */
type FakeHost = { readonly source?: PowerSource; readonly idle?: PowerCapability['state']; readonly lid?: PowerCapability['state']; readonly failHold?: string; readonly reason?: string };

/**
 * A fixture-only request process: it records its hold in `<dir>/holds/<pid>.json` and ends with its input (or after
 * its bounded carry time), like a real OS request ends with its process.
 */
const FAKE_HOLD_SCRIPT = `
const fs = require('fs');
const path = require('path');
const [dir, kind, mode, seconds] = process.argv.slice(1);
const file = path.join(dir, 'holds', process.pid + '.json');
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify({ kind, pid: process.pid, parent: process.ppid, carrier: mode === 'carry', at: new Date().toISOString() }));
const end = () => { try { fs.rmSync(file, { force: true }); } catch {} process.exit(0); };
for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(signal, end);
process.stdout.write('held\\n');
if (mode === 'carry') setTimeout(end, Number(seconds) * 1000);
else { process.stdin.on('end', end); process.stdin.on('error', end); process.stdin.resume(); }
`;

/**
 * Fixture adapter (`PTBK_POWER_ADAPTER=fake`): the power source and capabilities come from `PTBK_POWER_FAKE/power.json`,
 * and each request is a real child process whose lifetime is the request's.
 */
function fakeAdapter(env: NodeJS.ProcessEnv): PowerAdapter {
    const directory = env.PTBK_POWER_FAKE ?? '';
    const state = async (): Promise<FakeHost> => JSON.parse(await readFile(join(directory, 'power.json'), 'utf8').catch(() => '{}')) as FakeHost;
    const capability = (value: PowerCapability['state'] | undefined, fallback: PowerCapability['state'], what: string, reason?: string): PowerCapability =>
        (value ?? fallback) === 'available' ? { state: 'available', ...(what === 'lid' ? { validation: { validated: false, text: 'Fixture host (not hardware-validated).' } } : {}) } : { state: value ?? fallback, reason: reason ?? (value === 'approval' ? 'Local approval required (fixture).' : `Unsupported on the fixture host (${what}).`) };
    const lidHeld = async (): Promise<boolean> => {
        const files = await readdir(join(directory, 'holds')).catch(() => [] as string[]);
        for (const file of files) {
            const hold = JSON.parse(await readFile(join(directory, 'holds', file), 'utf8').catch(() => '{}')) as { kind?: string; pid?: number };
            if (hold.kind === 'lid' && hold.pid) {
                try {
                    process.kill(hold.pid, 0);
                    return true;
                } catch {
                    // a request ends with its process
                }
            }
        }
        return false;
    };
    return {
        platform: 'Fixture',
        pollMs: Number(env.PTBK_POWER_FAKE_POLL_MS) || 500,
        host: async () => ({ model: 'Fixture1,1', os: '1.0' }),
        readPower: async () => {
            const host = await state();
            return { source: host.source ?? 'external', detail: host.source === 'battery' ? 'Battery Power' : host.source === 'unknown' ? 'No reading' : 'AC Power' };
        },
        idleCapability: async () => {
            const host = await state();
            return capability(host.idle, 'available', 'idle', host.reason);
        },
        lidCapability: async () => {
            const host = await state();
            return capability(host.lid, 'unavailable', 'lid', host.reason);
        },
        observeLid: async () => ({ hasLid: true, lidClosed: false, sleepsOnClose: !(await lidHeld()), sleepDisabled: await lidHeld() }),
        hold: async (kind) => {
            const host = await state();
            if (host.failHold) throw new Error(host.failHold);
            return await holdProcess(kind, process.execPath, ['-e', FAKE_HOLD_SCRIPT, directory, kind, 'hold', '0'], { env, release: 'stdin', readyLine: 'held' });
        },
        carry: async (kinds, seconds, logs) => {
            const records: CarrierRecord[] = [];
            for (const kind of kinds) records.push(await startCarrier(kind, process.execPath, ['-e', FAKE_HOLD_SCRIPT, directory, kind, 'carry', String(seconds)], join(logs, `keep-awake-carrier-${kind}.log`), env));
            return records;
        },
        carryProblem: async () => ((await state()).failHold ? `the handoff cannot be prepared: ${(await state()).failHold}` : undefined),
    };
}

/**
 * The power adapter of this host (`PTBK_POWER_ADAPTER=fake|unsupported` selects a fixture or a disabled host).
 *
 * @private keep-awake adapters
 */
export function powerAdapter(env: NodeJS.ProcessEnv = process.env): PowerAdapter {
    const selected = env.PTBK_POWER_ADAPTER;
    if (selected === 'fake') return fakeAdapter(env);
    if (selected === 'unsupported') return unsupportedAdapter('Unsupported', 'Keep awake is disabled on this host (PTBK_POWER_ADAPTER=unsupported).');
    if (process.platform === 'darwin') return macAdapter(env);
    if (process.platform === 'win32') return windowsAdapter(env);
    if (process.platform === 'linux') return linuxAdapter(env);
    return unsupportedAdapter(process.platform, `Keep awake is not supported on ${process.platform}.`);
}
