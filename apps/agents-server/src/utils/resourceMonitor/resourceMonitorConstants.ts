/**
 * CPU load ratio that triggers a resource pressure warning.
 */
export const CPU_LOAD_WARNING_RATIO = 0.9;

/**
 * Free memory ratio that triggers a resource pressure warning.
 */
export const MEMORY_AVAILABLE_WARNING_RATIO = 0.1;

/**
 * Available disk ratio that triggers a resource pressure warning.
 */
export const DISK_AVAILABLE_WARNING_RATIO = 0.1;

/**
 * Available disk byte floor that triggers a resource pressure warning.
 */
export const DISK_AVAILABLE_WARNING_BYTES = 1024 * 1024 * 1024;

/**
 * Default CPU sample duration for process usage.
 */
export const DEFAULT_PROCESS_CPU_SAMPLE_DURATION_MS = 250;

/**
 * Default network sample duration for rate calculation.
 */
export const DEFAULT_NETWORK_SAMPLE_DURATION_MS = 250;
