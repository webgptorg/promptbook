/**
 * Resource key tracked by the server resource monitor.
 */
export type ResourceMonitorResource = 'cpu' | 'memory' | 'disk';

/**
 * One warning issue detected by the resource monitor.
 */
export type ServerResourceWarningIssue = {
    /**
     * Resource that crossed a warning threshold.
     */
    readonly resource: ResourceMonitorResource;

    /**
     * Human-readable warning message.
     */
    readonly message: string;
};

/**
 * Lightweight resource status safe to pass into client navigation.
 */
export type ServerResourceWarningStatus = {
    /**
     * Whether any monitored resource is currently under pressure.
     */
    readonly isWarningShown: boolean;

    /**
     * Individual resource pressure issues.
     */
    readonly issues: ReadonlyArray<ServerResourceWarningIssue>;

    /**
     * Human-readable warning messages.
     */
    readonly warningMessages: ReadonlyArray<string>;
};

/**
 * Default empty resource warning status.
 */
export const RESOURCE_MONITOR_OK_WARNING_STATUS: ServerResourceWarningStatus = {
    isWarningShown: false,
    issues: [],
    warningMessages: [],
};

/**
 * CPU usage snapshot.
 */
export type CpuResourceUsage = {
    /**
     * Number of logical CPU cores visible to Node.js.
     */
    readonly coreCount: number;

    /**
     * One-minute system load average, or `null` when the platform does not expose it.
     */
    readonly averageLoadOneMinute: number | null;

    /**
     * Five-minute system load average, or `null` when the platform does not expose it.
     */
    readonly averageLoadFiveMinutes: number | null;

    /**
     * Fifteen-minute system load average, or `null` when the platform does not expose it.
     */
    readonly averageLoadFifteenMinutes: number | null;

    /**
     * One-minute load divided by logical CPU cores.
     */
    readonly loadRatio: number | null;

    /**
     * Current Node.js process CPU ratio sampled over a short interval.
     */
    readonly processUsageRatio: number | null;
};

/**
 * Memory usage snapshot.
 */
export type MemoryResourceUsage = {
    readonly totalBytes: number;
    readonly freeBytes: number;
    readonly usedBytes: number;
    readonly usedRatio: number;
    readonly availableRatio: number;
    readonly processRssBytes: number;
    readonly processHeapUsedBytes: number;
    readonly processHeapTotalBytes: number;
    readonly processExternalBytes: number;
    readonly processArrayBuffersBytes: number;
};

/**
 * Disk usage snapshot for the filesystem that hosts the server process.
 */
export type DiskResourceUsage = {
    readonly inspectedPath: string;
    readonly totalBytes: number | null;
    readonly freeBytes: number | null;
    readonly availableBytes: number | null;
    readonly usedBytes: number | null;
    readonly usedRatio: number | null;
    readonly availableRatio: number | null;
    readonly errorMessage: string | null;
};

/**
 * Network traffic snapshot for one interface.
 */
export type NetworkInterfaceResourceUsage = {
    readonly name: string;
    readonly receivedBytes: number;
    readonly transmittedBytes: number;
    readonly receivedBytesPerSecond: number | null;
    readonly transmittedBytesPerSecond: number | null;
};

/**
 * Network traffic summary.
 */
export type NetworkResourceUsage = {
    /**
     * Whether traffic counters are available on this host.
     */
    readonly isTrafficAvailable: boolean;

    readonly interfaces: ReadonlyArray<NetworkInterfaceResourceUsage>;
    readonly totalReceivedBytes: number | null;
    readonly totalTransmittedBytes: number | null;
    readonly totalReceivedBytesPerSecond: number | null;
    readonly totalTransmittedBytesPerSecond: number | null;
    readonly networkInterfaceCount: number;
    readonly networkAddressCount: number;
    readonly errorMessage: string | null;
};

/**
 * Full resource monitor snapshot rendered by `/admin/resource-monitor`.
 */
export type ServerResourceMonitorSnapshot = {
    readonly measuredAt: string;
    readonly cpu: CpuResourceUsage;
    readonly memory: MemoryResourceUsage;
    readonly disk: DiskResourceUsage;
    readonly network: NetworkResourceUsage;
    readonly warningStatus: ServerResourceWarningStatus;
};
