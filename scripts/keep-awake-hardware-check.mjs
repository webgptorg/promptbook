#!/usr/bin/env node
/**
 * Physical closed-lid check for keep awake on a MacBook (specs/cli/power-management.md, Acceptance).
 *
 *     node scripts/keep-awake-hardware-check.mjs record [--path <project>] [--interval <seconds>] [--out <file>]
 *     node scripts/keep-awake-hardware-check.mjs report <file>
 *
 * `record` writes a heartbeat with the power source, lid state, `SleepDisabled` and the engine's keep-awake status
 * until it is interrupted (Ctrl+C), then prints the report. Start it with the engine running, keep awake on and
 * closed-lid operation chosen, disconnect external displays, close the lid for the test period and open it again.
 * The report lists heartbeat gaps and the system's own sleep and wake log for the period; a validated run gives the
 * entry for `CLOSED_LID_VALIDATED` in src/power/adapters.ts. The remaining acceptance checks (an actual task
 * continuing, a scheduled task starting, reachability from a second device, desktop and CLI installations) stay
 * manual.
 */
import { execFile } from 'node:child_process';
import { appendFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);

/**
 * Default heartbeat interval in seconds.
 */
const DEFAULT_INTERVAL_SECONDS = 10;

/**
 * A heartbeat this many intervals late counts as a gap (the computer or the process was suspended).
 */
const GAP_FACTOR = 3;

/**
 * How long one OS query may take.
 */
const QUERY_TIMEOUT_MS = 20_000;

/**
 * Milliseconds per second.
 */
const SECOND_MS = 1000;

/**
 * The CLI of this checkout.
 */
const BIN = fileURLToPath(new URL('../bin/ptbk.js', import.meta.url));

/**
 * Output of a command, or an empty string when it is unavailable.
 */
async function output(file, args) {
    try {
        return (await run(file, args, { encoding: 'utf8', timeout: QUERY_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024 })).stdout;
    } catch {
        return '';
    }
}

/**
 * Value of a command-line option.
 */
function option(args, name) {
    const index = args.indexOf(`--${name}`);
    return index < 0 ? undefined : args[index + 1];
}

/**
 * One observation of the host and the engine.
 */
async function sample(project) {
    const [ps, clamshell, settings, status] = await Promise.all([
        output('/usr/bin/pmset', ['-g', 'ps']),
        output('/usr/sbin/ioreg', ['-r', '-k', 'AppleClamshellState', '-d', '4']),
        output('/usr/bin/pmset', ['-g']),
        output(process.execPath, [BIN, 'keep-awake', '--json', ...(project ? ['--path', project] : [])]),
    ]);
    let keepAwake;
    try {
        const view = JSON.parse(status);
        keepAwake = { mode: view.mode, holding: view.holding, idle: view.idle?.state, lid: view.lid?.state, engine: view.engine };
    } catch {
        keepAwake = undefined;
    }
    return {
        at: new Date().toISOString(),
        power: /Now drawing from '([^']+)'/.exec(ps)?.[1] ?? 'unknown',
        lidClosed: /"AppleClamshellState" = Yes/.test(clamshell) ? true : /"AppleClamshellState" = No/.test(clamshell) ? false : undefined,
        sleepDisabled: /^\s*SleepDisabled\s+1\b/m.test(settings),
        keepAwake,
    };
}

/**
 * Model, macOS version and connected displays.
 */
async function host() {
    const [model, version, displays] = await Promise.all([output('/usr/sbin/sysctl', ['-n', 'hw.model']), output('/usr/bin/sw_vers', ['-productVersion']), output('/usr/sbin/system_profiler', ['SPDisplaysDataType', '-json'])]);
    let screens = [];
    try {
        screens = JSON.parse(displays).SPDisplaysDataType.flatMap((gpu) => gpu.spdisplays_ndrvs ?? []).map((screen) => ({ name: screen._name, internal: screen.spdisplays_connection_type === 'spdisplays_internal' }));
    } catch {
        screens = [];
    }
    return { model: model.trim(), macos: version.trim(), displays: screens };
}

/**
 * Records heartbeats until interrupted, then reports.
 */
async function record(args) {
    const interval = Number(option(args, 'interval') ?? DEFAULT_INTERVAL_SECONDS);
    const project = option(args, 'path');
    const file = option(args, 'out') ?? join(process.cwd(), `keep-awake-check-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`);
    const machine = await host();
    await appendFile(file, `${JSON.stringify({ host: machine, interval, startedAt: new Date().toISOString() })}\n`);
    process.stdout.write(`Recording to ${file} every ${interval}s on ${machine.model} with macOS ${machine.macos}. Close the lid now; open it again and press Ctrl+C to finish.\n`);
    if (machine.displays.some((screen) => !screen.internal)) process.stdout.write(`Note: an external display is connected (${machine.displays.filter((screen) => !screen.internal).map((screen) => screen.name).join(', ')}); disconnect it for the no-monitor case.\n`);
    let stopping = false;
    process.once('SIGINT', () => (stopping = true));
    while (!stopping) {
        await appendFile(file, `${JSON.stringify(await sample(project))}\n`);
        for (let waited = 0; waited < interval * SECOND_MS && !stopping; waited += SECOND_MS / 4) await new Promise((resolve) => setTimeout(resolve, SECOND_MS / 4));
    }
    // After the last request ends the setting must be restored; one final sample shows the state at the end.
    await appendFile(file, `${JSON.stringify({ ...(await sample(project)), final: true })}\n`);
    await report(file);
}

/**
 * Summarizes a recording.
 */
async function report(file) {
    const [header, ...samples] = (await readFile(file, 'utf8')).trim().split('\n').map((line) => JSON.parse(line));
    const beats = samples.filter((item) => !item.final);
    if (!beats.length) throw new Error('The recording has no heartbeats.');
    const limit = header.interval * SECOND_MS * GAP_FACTOR;
    const gaps = [];
    for (let index = 1; index < beats.length; index++) {
        const gap = Date.parse(beats[index].at) - Date.parse(beats[index - 1].at);
        if (gap > limit) gaps.push({ from: beats[index - 1].at, to: beats[index].at, seconds: Math.round(gap / SECOND_MS) });
    }
    const closed = beats.filter((item) => item.lidClosed === true);
    const closedSeconds = closed.length * header.interval;
    const onBattery = beats.filter((item) => item.power !== 'AC Power');
    const unprotected = closed.filter((item) => !item.sleepDisabled || item.keepAwake?.lid !== 'active');
    const from = new Date(Date.parse(beats[0].at)).toISOString();
    const to = beats.at(-1).at;
    // The system's own record of sleep and wake events during the period.
    const log = (await output('/usr/bin/pmset', ['-g', 'log']))
        .split('\n')
        .filter((line) => /\b(Sleep|Wake|DarkWake)\s{2,}/.test(line))
        .filter((line) => {
            const at = Date.parse(line.slice(0, 25).replace(' ', 'T').replace(' ', ''));
            return Number.isFinite(at) && at >= Date.parse(from) && at <= Date.parse(to);
        });
    const final = samples.find((item) => item.final);
    const externals = header.host.displays.filter((screen) => !screen.internal);
    const passed = closed.length > 0 && !gaps.length && !log.some((line) => /\bSleep\s{2,}/.test(line)) && !onBattery.length && !unprotected.length && !externals.length;
    const lines = [
        `Host: ${header.host.model}, macOS ${header.host.macos}; displays: ${header.host.displays.map((screen) => `${screen.name}${screen.internal ? ' (built-in)' : ' (external)'}`).join(', ') || 'unknown'}`,
        `Period: ${from} – ${to}, ${beats.length} heartbeats every ${header.interval}s; lid closed for about ${closedSeconds}s`,
        `Heartbeat gaps over ${limit / SECOND_MS}s: ${gaps.length ? gaps.map((gap) => `${gap.from} → ${gap.to} (${gap.seconds}s)`).join('; ') : 'none'}`,
        `System sleep log in the period: ${log.length ? `\n  ${log.join('\n  ')}` : 'no sleep or wake events'}`,
        `Not on AC power: ${onBattery.length ? `${onBattery.length} heartbeats (${[...new Set(onBattery.map((item) => item.power))].join(', ')})` : 'never'}`,
        `Lid closed without an active closed-lid request: ${unprotected.length ? `${unprotected.length} heartbeats` : 'never'}`,
        `At the end: SleepDisabled ${final?.sleepDisabled ? 'on' : 'off'}${final?.keepAwake ? `, keep awake ${final.keepAwake.mode}${final.keepAwake.holding ? ' (holding)' : ''}` : ''}`,
        '',
        passed
            ? `Passed. After the remaining manual checks, add to CLOSED_LID_VALIDATED in src/power/adapters.ts:\n  { model: '${header.host.model}', macos: '${header.host.macos.split('.')[0]}', checkedAt: '${to.slice(0, 10)}' }`
            : `Not validated${closed.length ? '' : ' (the lid was never observed closed)'}${externals.length ? ' (an external display was connected)' : ''}.`,
    ];
    process.stdout.write(`${lines.join('\n')}\n`);
    process.exitCode = passed ? 0 : 1;
}

const [command, ...rest] = process.argv.slice(2);
if (process.platform !== 'darwin') {
    process.stderr.write('This check is for a physical Mac.\n');
    process.exit(2);
}
if (command === 'record') await record(rest);
else if (command === 'report' && rest[0]) await report(rest[0]);
else {
    process.stderr.write('Usage: node scripts/keep-awake-hardware-check.mjs record [--path <project>] [--interval <seconds>] [--out <file>] | report <file>\n');
    process.exit(2);
}
