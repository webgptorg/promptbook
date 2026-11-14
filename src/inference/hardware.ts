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
 * Read-only discovery of the engine user's hardware (bounded; never installs drivers or starts services).
 *
 * @private local inference hardware
 */
export async function discoverHardware(env: NodeJS.ProcessEnv = process.env): Promise<HostHardware> {
    const os = platform();
    const architecture = arch();
    const total = totalmem();
    let freeDiskBytes: number | undefined;
    try {
        const stats = await statfs(homedir());
        freeDiskBytes = Number(stats.bavail) * Number(stats.bsize);
    } catch {
        freeDiskBytes = undefined;
    }
    let accelerator: HostHardware['accelerator'] = { kind: 'unknown' };
    if (os === 'darwin' && architecture === 'arm64') accelerator = { kind: 'unified', name: 'Apple Silicon GPU (Metal, shared system memory)' };
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
        freeMemoryBytes: freemem(),
        ...(freeDiskBytes !== undefined ? { freeDiskBytes } : {}),
        accelerator,
        inferenceMemoryBytes,
        summary: `${os} ${architecture}, ${formatBytes(total)} RAM, ${acceleratorText}${freeDiskBytes !== undefined ? `, ${formatBytes(freeDiskBytes)} free disk` : ''}`,
    };
}
