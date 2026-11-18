import type { InferenceRuntimeToolRecord, InferenceRuntimeVariant } from '../tools/model.js';

/**
 * Where a runtime model executes: verified on the engine host, served from a cloud behind the runtime, or unknown
 * (which never satisfies a hard local restriction).
 *
 * @private inference runtime contract
 */
export type ModelLocality = 'local' | 'cloud' | 'unknown';

/**
 * Whether a model capability is supported, unsupported or not known (unknown never passes a requirement).
 *
 * @private inference runtime contract
 */
export type CapabilityObservation = boolean | 'unknown';

/**
 * One model of a runtime catalog with its actual identifier. Unknown metadata stays absent, never invented.
 *
 * @private inference runtime contract
 */
export type RuntimeModel = {
    /** The runtime's actual identifier (`gpt-oss:20b`, `openai/gpt-oss-20b`). */
    readonly id: string;
    /** Whether its weights are present on this host (a cloud model is never "installed"). */
    readonly installed: boolean;
    /** Verified execution locality of this model through this runtime. */
    readonly locality: ModelLocality;
    /** Currently loaded into memory by the runtime. */
    readonly loaded?: boolean;
    readonly family?: string;
    readonly parameterSize?: string;
    readonly quantization?: string;
    /** Content digest or version where exposed. */
    readonly digest?: string;
    /** Size of the weights on disk (bytes). */
    readonly sizeBytes?: number;
    /** Maximum context length where exposed. */
    readonly contextLength?: number;
    /** Model manufacturer/publisher where known. */
    readonly manufacturer?: string;
    /** Tool/function calling as declared by the runtime. */
    readonly tools: CapabilityObservation;
    /** Image input as declared by the runtime. */
    readonly vision: CapabilityObservation;
};

/**
 * Observed state of one runtime service on the engine host (read-only: never installs, downloads, authenticates or
 * runs inference).
 *
 * @private inference runtime contract
 */
export type RuntimeObservation = {
    readonly variant: InferenceRuntimeVariant;
    readonly displayName: string;
    /** Service root URL that was inspected. */
    readonly endpoint: string;
    /** Whether the endpoint was configured by the project or discovered by the adapter. */
    readonly endpointSource: 'configured' | 'discovered';
    /** The endpoint is served on the engine host (loopback); a remote endpoint can never satisfy `runtime=local`. */
    readonly onEngineHost: boolean;
    /** Stable identity of the actual service (loopback aliases of one port are the same service). */
    readonly resourceKey: string;
    /** Management executable found on PATH (`ollama`, `lms`). */
    readonly executablePath?: string;
    /** Runtime version reported by the service or its executable. */
    readonly version?: string;
    /** The service answered. */
    readonly running: boolean;
    /** The catalog (absent while the service is not reachable). */
    readonly models?: readonly RuntimeModel[];
    /** One-line state summary. */
    readonly summary: string;
    /** Category of a problem. */
    readonly problem?: 'missing' | 'stopped' | 'unreachable' | 'no-models' | 'error';
    /** Concrete next action of a problem. */
    readonly nextAction?: string;
    /** Observation time (epoch ms). */
    readonly checkedAt: number;
};

/**
 * Progress of a long runtime operation (download, load, installation).
 *
 * @private inference runtime contract
 */
export type RuntimeProgress = {
    readonly stage: string;
    /** Completed and total bytes where the runtime reports them. */
    readonly completedBytes?: number;
    readonly totalBytes?: number;
    readonly message?: string;
};

/**
 * Inputs of runtime operations.
 *
 * @private inference runtime contract
 */
export type RuntimeContext = {
    /** The project reference (absent for host-level discovery). */
    readonly tool?: Pick<InferenceRuntimeToolRecord, 'name' | 'variant' | 'endpoint'>;
    /** Discovery environment of the engine user. */
    readonly env: NodeJS.ProcessEnv;
    readonly signal?: AbortSignal;
};

/**
 * Host-level maintenance actions of a runtime, by their CLI spelling.
 *
 * @private inference runtime contract
 */
export const RUNTIME_ACTIONS = ['status', 'models', 'download', 'load', 'unload', 'remove-model', 'start', 'stop', 'restart', 'update', 'uninstall'] as const;

/**
 * One runtime action.
 *
 * @private inference runtime contract
 */
export type RuntimeAction = (typeof RUNTIME_ACTIONS)[number];

/**
 * Wire protocols a harness can use to reach a runtime.
 *
 * @private inference runtime contract
 */
export type RuntimeProtocol = 'openai' | 'anthropic';

/**
 * Supported installation route of a missing runtime on this platform (absent: manual installation only).
 *
 * @private inference runtime contract
 */
export type RuntimeInstallation = {
    /** What will be run, shown before consent. */
    readonly description: string;
    readonly command: string;
    readonly args: readonly string[];
    /** Whether the route may ask for administrator approval. */
    readonly mayNeedAdministrator: boolean;
};

/**
 * The extensible runtime adapter contract shared by init, CLI, Console and engine runtime. Provider commands, native
 * package management and response parsing stay inside adapters.
 *
 * @private inference runtime contract
 */
export type RuntimeAdapter = {
    readonly variant: InferenceRuntimeVariant;
    readonly displayName: string;
    /** Management executable name. */
    readonly executable: string;
    /** The local service address the adapter discovers when no endpoint is configured. */
    readonly defaultEndpoint: string;
    readonly homepage: string;
    /** Actions the adapter implements (others are reported unsupported, never pretended). */
    readonly actions: readonly RuntimeAction[];
    /** Read-only observation of service, version and catalog. */
    readonly inspect: (context: RuntimeContext) => Promise<RuntimeObservation>;
    /** Downloads one model with progress (an accepted, explicit operation). */
    readonly download?: (context: RuntimeContext, model: string, onProgress: (progress: RuntimeProgress) => void) => Promise<void>;
    readonly load?: (context: RuntimeContext, model: string) => Promise<void>;
    readonly unload?: (context: RuntimeContext, model: string) => Promise<void>;
    readonly removeModel?: (context: RuntimeContext, model: string) => Promise<void>;
    /** Starts the service as the engine user; returns the PID of a Promptbook-started process, if any. */
    readonly start?: (context: RuntimeContext) => Promise<number | undefined>;
    /** Supported installation route on this platform. */
    readonly installation?: (platform: NodeJS.Platform, env: NodeJS.ProcessEnv) => Promise<RuntimeInstallation | undefined>;
    /** Protocol endpoint a harness transport needs, derived from the service root (absent: unsupported protocol). */
    readonly protocolEndpoint: (serviceRoot: string, protocol: RuntimeProtocol) => string | undefined;
    /** A non-secret compatibility token some clients require for a credential-free local route (never an API key). */
    readonly compatibilityToken: string;
};
