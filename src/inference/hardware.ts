import { statfs } from 'node:fs/promises';
import { arch, cpus, freemem, homedir, platform, totalmem } from 'node:os';
import { runProcess, which } from '../common/process.js';

/**
 * Observed hardware of the engine host relevant to local inference. Unknown values stay absent; nothing is estimated
 * from marketing names.
 *
 * @private local inference hardware
 */
export type HostHardware = {
    readonly platform: NodeJS.Platform;
    readonly architecture: string;
    readonly cpuModel?: string;
    readonly cpuCount: number;
    readonly totalMemoryBytes: number;
    readonly freeMemoryBytes: number;
    /** Free disk space where models are stored (the user's home volume). */
    readonly freeDiskBytes?: number;
    /** `unified` (Apple Silicon: GPU shares system memory), `discrete` with its VRAM, `none`, or `unknown`. */
    readonly accelerator: { readonly kind: 'unified'; readonly name: string } | { readonly kind: 'discrete'; readonly name: string; readonly memoryBytes?: number } | { readonly kind: 'none' | 'unknown' };
    /** Memory available to model weights and context: VRAM of a discrete GPU, otherwise system memory. */
    readonly inferenceMemoryBytes: number;
    /** Honest one-line description. */
    readonly summary: string;
};

/**
 * Formats bytes for people (decimal gigabytes, like download sizes are published).
 *
 * @private local inference hardware
 */
export function formatBytes(bytes: number | undefined): string {
    if (bytes === undefined) return 'unknown size';
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(bytes >= 1e10 ? 0 : 1)} GB`;
    if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`;
    return `${Math.round(bytes / 1e3)} kB`;
}

/**
 * Deterministic capacity substitute of a test fixture (`PTBK_HARDWARE_FIXTURE`, a JSON object with any of
 * `totalMemoryBytes`, `freeMemoryBytes`, `freeDiskBytes` and `accelerator`). It makes local-model setup fixtures
 * independent of the hosted runner's RAM, disk and load; the memory check itself still runs against these values.
 */
type HardwareFixture = Partial<Pick<HostHardware, 'totalMemoryBytes' | 'freeMemoryBytes' | 'freeDiskBytes' | 'accelerator'>>;

/**
 * Parses the fixture override; an unreadable value is an explicit failure rather than silently observing the host.
 */
function hardwareFixture(env: NodeJS.ProcessEnv): HardwareFixture | undefined {
    const text = env.PTBK_HARDWARE_FIXTURE?.trim();
    if (!text) return undefined;
    let value: unknown;
    try {
        value = JSON.parse(text);
    } catch {
        throw new Error('PTBK_HARDWARE_FIXTURE is not valid JSON.');
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('PTBK_HARDWARE_FIXTURE must be a JSON object.');
    const fixture = value as Record<string, unknown>;
    const bytes = (key: 'totalMemoryBytes' | 'freeMemoryBytes' | 'freeDiskBytes'): number | undefined => {
        const amount = fixture[key];
        if (amount === undefined) return undefined;
        if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) throw new Error(`PTBK_HARDWARE_FIXTURE.${key} must be a non-negative number of bytes.`);
        return amount;
    };
    const accelerator = fixture.accelerator as HostHardware['accelerator'] | undefined;
    if (accelerator !== undefined && (!accelerator || typeof accelerator !== 'object' || !['unified', 'discrete', 'none', 'unknown'].includes(accelerator.kind))) throw new Error('PTBK_HARDWARE_FIXTURE.accelerator.kind must be unified, discrete, none or unknown.');
    const total = bytes('totalMemoryBytes');
    const free = bytes('freeMemoryBytes');
    const disk = bytes('freeDiskBytes');
    return { ...(total !== undefined ? { totalMemoryBytes: total } : {}), ...(free !== undefined ? { freeMemoryBytes: free } : {}), ...(disk !== undefined ? { freeDiskBytes: disk } : {}), ...(accelerator ? { accelerator } : {}) };
}

/**
 * Read-only discovery of the engine user's hardware (bounded; never installs drivers or starts services).
 *
 * @private local inference hardware
 */
export async function discoverHardware(env: NodeJS.ProcessEnv = process.env): Promise<HostHardware> {
    const fixture = hardwareFixture(env);
    const os = platform();
    const architecture = arch();
    const total = fixture?.totalMemoryBytes ?? totalmem();
    let freeDiskBytes: number | undefined;
    if (fixture && 'freeDiskBytes' in fixture) freeDiskBytes = fixture.freeDiskBytes;
    else
        try {
            const stats = await statfs(homedir());
            freeDiskBytes = Number(stats.bavail) * Number(stats.bsize);
        } catch {
            freeDiskBytes = undefined;
        }
    let accelerator: HostHardware['accelerator'] = { kind: 'unknown' };
    if (fixture?.accelerator) accelerator = fixture.accelerator;
    else if (os === 'darwin' && architecture === 'arm64') accelerator = { kind: 'unified', name: 'Apple Silicon GPU (Metal, shared system memory)' };
    else if (await which('nvidia-smi', env)) {
        const result = await runProcess('nvidia-smi', ['--query-gpu=name,memory.total', '--format=csv,noheader,nounits'], { cwd: homedir(), env, timeoutMs: 5_000 });
        const [name, memory] = result.stdout.split('\n')[0]?.split(',').map((part) => part.trim()) ?? [];
        if (result.exitCode === 0 && name) accelerator = { kind: 'discrete', name, ...(memory && Number(memory) ? { memoryBytes: Number(memory) * 1024 * 1024 } : {}) };
    } else if (os === 'darwin') accelerator = { kind: 'none' };
    const inferenceMemoryBytes = accelerator.kind === 'discrete' && accelerator.memoryBytes ? accelerator.memoryBytes : total;
    const cpu = cpus()[0]?.model?.trim();
    const acceleratorText = accelerator.kind === 'unified' ? accelerator.name : accelerator.kind === 'discrete' ? `${accelerator.name}${accelerator.memoryBytes ? ` (${formatBytes(accelerator.memoryBytes)} VRAM)` : ''}` : accelerator.kind === 'none' ? 'no GPU acceleration (CPU only)' : 'GPU unknown (CPU-only speed assumed)';
    return {
        platform: os,
        architecture,
        ...(cpu ? { cpuModel: cpu } : {}),
        cpuCount: cpus().length,
        totalMemoryBytes: total,
        freeMemoryBytes: fixture?.freeMemoryBytes ?? freemem(),
        ...(freeDiskBytes !== undefined ? { freeDiskBytes } : {}),
        accelerator,
        inferenceMemoryBytes,
        summary: `${os} ${architecture}, ${formatBytes(total)} RAM, ${acceleratorText}${freeDiskBytes !== undefined ? `, ${formatBytes(freeDiskBytes)} free disk` : ''}`,
    };
}
