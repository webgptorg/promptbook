import type { HarnessVariant, InferenceRuntimeVariant, ThinkingLevel } from '../tools/model.js';
import { formatBytes, type HostHardware } from './hardware.js';
import type { RuntimeModel } from './types.js';

/**
 * How far a combination is verified: `upstream` means the harness vendor ships it as its own local default and
 * Promptbook's fixture checks pass; nothing here claims Promptbook ran it end to end on every platform.
 *
 * @private local model catalog
 */
export type CombinationVerification = 'upstream' | 'fixture';

/**
 * One recommended runtime/harness/model combination of the extensible, refreshable recommendation catalog.
 *
 * @private local model catalog
 */
export type LocalCombination = {
    readonly runtime: InferenceRuntimeVariant;
    readonly harness: HarnessVariant;
    /** The runtime's actual model identifier. */
    readonly model: string;
    readonly manufacturer: string;
    readonly license: string;
    /** Published download size of the default quantization. */
    readonly downloadBytes: number;
    /** Memory needed for the weights plus a working context; below it the model does not fit. */
    readonly minimumMemoryBytes: number;
    readonly quantization: string;
    readonly thinkingLevels: readonly ThinkingLevel[];
    readonly defaultThinkingLevel?: ThinkingLevel;
    /** Automatic installation of the runtime is offered for this combination. */
    readonly automaticInstall: boolean;
    readonly verification: CombinationVerification;
    readonly note: string;
};

/**
 * The verified starting matrix: Codex CLI with Ollama (automatic installation) and an existing LM Studio. Other
 * combinations are added here only after their real checks pass; nothing is advertised in advance.
 *
 * @private local model catalog
 */
export const LOCAL_COMBINATIONS: readonly LocalCombination[] = [
    {
        runtime: 'OLLAMA',
        harness: 'OPENAI_CODEX',
        model: 'gpt-oss:20b',
        manufacturer: 'OpenAI',
        license: 'Apache-2.0',
        downloadBytes: 14_000_000_000,
        minimumMemoryBytes: 16_000_000_000,
        quantization: 'MXFP4',
        thinkingLevels: ['low', 'medium', 'high'],
        defaultThinkingLevel: 'medium',
        automaticInstall: true,
        verification: 'upstream',
        note: 'the open-weight model Codex itself uses for local work (tools, MCP and sandboxed read-only turns)',
    },
    {
        runtime: 'OLLAMA',
        harness: 'OPENAI_CODEX',
        model: 'gpt-oss:120b',
        manufacturer: 'OpenAI',
        license: 'Apache-2.0',
        downloadBytes: 65_000_000_000,
        minimumMemoryBytes: 80_000_000_000,
        quantization: 'MXFP4',
        thinkingLevels: ['low', 'medium', 'high'],
        defaultThinkingLevel: 'medium',
        automaticInstall: true,
        verification: 'upstream',
        note: 'the larger Codex open-weight model for hosts with at least 80 GB of (V)RAM',
    },
    {
        runtime: 'LM_STUDIO',
        harness: 'OPENAI_CODEX',
        model: 'openai/gpt-oss-20b',
        manufacturer: 'OpenAI',
        license: 'Apache-2.0',
        downloadBytes: 12_100_000_000,
        minimumMemoryBytes: 16_000_000_000,
        quantization: 'MXFP4',
        thinkingLevels: ['low', 'medium', 'high'],
        defaultThinkingLevel: 'medium',
        automaticInstall: false,
        verification: 'upstream',
        note: 'Codex with an existing LM Studio server (LM Studio is not installed automatically)',
    },
];

/**
 * Catalog metadata of a runtime model, if it is a known combination.
 *
 * @private local model catalog
 */
export function knownLocalModel(runtime: InferenceRuntimeVariant, model: string, harness?: HarnessVariant): LocalCombination | undefined {
    return LOCAL_COMBINATIONS.find((entry) => entry.runtime === runtime && entry.model === model && (!harness || entry.harness === harness));
}

/**
 * A recommendation for this host: the model to use and why, or an honest incompatibility.
 *
 * @private local model catalog
 */
export type LocalRecommendation = {
    readonly combination?: LocalCombination;
    /** The model is already downloaded (reused; nothing to download). */
    readonly installed: boolean;
    /** Smaller supported alternatives that also fit, for an explicit choice. */
    readonly alternatives: readonly LocalCombination[];
    /** Capacity/speed limitations worth knowing, without invented benchmarks. */
    readonly limitations: readonly string[];
    /** Why nothing fits, when no combination does. */
    readonly incompatibility?: string;
};

/**
 * Recommends a verified combination for the host: an already downloaded catalog model first, otherwise the largest one
 * whose weights and working context fit the inference memory and free disk.
 *
 * @private local model catalog
 */
export function recommendLocalModel(hardware: HostHardware, runtime: InferenceRuntimeVariant, harness: HarnessVariant, installed: readonly RuntimeModel[] = []): LocalRecommendation {
    const candidates = LOCAL_COMBINATIONS.filter((entry) => entry.runtime === runtime && entry.harness === harness);
    const limitations: string[] = [];
    if (hardware.accelerator.kind === 'none' || hardware.accelerator.kind === 'unknown') limitations.push('No GPU acceleration was detected: local models run on the CPU and answer much more slowly than hosted models.');
    const fits = (entry: LocalCombination): boolean => hardware.inferenceMemoryBytes >= entry.minimumMemoryBytes;
    const reused = candidates.find((entry) => installed.some((model) => model.id === entry.model && model.locality === 'local') && fits(entry));
    if (reused) return { combination: reused, installed: true, alternatives: candidates.filter((entry) => entry !== reused && fits(entry)), limitations };
    const fitting = candidates.filter((entry) => fits(entry) && (hardware.freeDiskBytes === undefined || hardware.freeDiskBytes > entry.downloadBytes * 1.1)).sort((a, b) => b.minimumMemoryBytes - a.minimumMemoryBytes);
    if (fitting.length) {
        const [best, ...rest] = fitting;
        if (hardware.totalMemoryBytes < best!.minimumMemoryBytes * 1.5) limitations.push(`${best!.model} uses most of this host's memory: other applications and concurrent local work compete for it.`);
        return { combination: best, installed: false, alternatives: rest, limitations };
    }
    const smallest = [...candidates].sort((a, b) => a.minimumMemoryBytes - b.minimumMemoryBytes)[0];
    if (!smallest) return { installed: false, alternatives: [], limitations, incompatibility: `No verified local combination exists yet for ${runtime} with ${harness}.` };
    const memoryShort = !fits(smallest);
    return {
        installed: false,
        alternatives: [],
        limitations,
        incompatibility: memoryShort
            ? `The smallest verified model (${smallest.model}) needs about ${formatBytes(smallest.minimumMemoryBytes)} of memory for its weights and context; this host has ${formatBytes(hardware.inferenceMemoryBytes)}.`
            : `${smallest.model} needs about ${formatBytes(smallest.downloadBytes)} of free disk space; ${formatBytes(hardware.freeDiskBytes)} is free.`,
    };
}
