import { readFile } from 'node:fs/promises';
import os from 'node:os';

import { DEFAULT_NETWORK_SAMPLE_DURATION_MS } from './resourceMonitorConstants';
import { waitForResourceMonitorSample } from './waitForResourceMonitorSample';
import type { NetworkInterfaceResourceUsage, NetworkResourceUsage } from './resourceMonitorTypes';

/**
 * Linux network counter source.
 */
const LINUX_NETWORK_COUNTERS_PATH = '/proc/net/dev';

/**
 * Loopback interface omitted from host traffic totals.
 */
const LOOPBACK_NETWORK_INTERFACE_NAME = 'lo';

/**
 * Field index containing transmitted bytes in `/proc/net/dev`.
 */
const TRANSMITTED_BYTES_FIELD_INDEX = 8;

/**
 * Raw traffic counters read from the operating system.
 */
type NetworkTrafficCounter = {
    readonly name: string;
    readonly receivedBytes: number;
    readonly transmittedBytes: number;
};

/**
 * Result of reading traffic counters from the host.
 */
type NetworkTrafficCounterReadResult = {
    readonly counters: ReadonlyArray<NetworkTrafficCounter> | null;
    readonly errorMessage: string | null;
};

/**
 * Reads network usage with current traffic rates when host counters are available.
 *
 * @param sampleDurationMs - Sampling duration used for byte-per-second rates.
 * @returns Network usage snapshot.
 */
export async function readNetworkResourceUsage(
    sampleDurationMs: number = DEFAULT_NETWORK_SAMPLE_DURATION_MS,
): Promise<NetworkResourceUsage> {
    const interfaceSummary = readNetworkInterfaceSummary();
    const firstRead = await readLinuxNetworkTrafficCounters();

    if (!firstRead.counters) {
        return createUnavailableNetworkResourceUsage(interfaceSummary, firstRead.errorMessage);
    }

    const isRateSampled = sampleDurationMs > 0;
    if (!isRateSampled) {
        return createAvailableNetworkResourceUsage({
            interfaceSummary,
            counters: firstRead.counters,
            previousCounters: null,
            elapsedSeconds: null,
            errorMessage: null,
        });
    }

    const startedAtNanoseconds = process.hrtime.bigint();
    await waitForResourceMonitorSample(sampleDurationMs);
    const secondRead = await readLinuxNetworkTrafficCounters();
    const elapsedSeconds = Number(process.hrtime.bigint() - startedAtNanoseconds) / 1_000_000_000;

    if (!secondRead.counters) {
        return createAvailableNetworkResourceUsage({
            interfaceSummary,
            counters: firstRead.counters,
            previousCounters: null,
            elapsedSeconds: null,
            errorMessage: secondRead.errorMessage,
        });
    }

    return createAvailableNetworkResourceUsage({
        interfaceSummary,
        counters: secondRead.counters,
        previousCounters: firstRead.counters,
        elapsedSeconds: Number.isFinite(elapsedSeconds) && elapsedSeconds > 0 ? elapsedSeconds : null,
        errorMessage: null,
    });
}

/**
 * Reads interface and address counts from Node.js network metadata.
 *
 * @returns Network interface summary.
 */
function readNetworkInterfaceSummary(): Pick<NetworkResourceUsage, 'networkInterfaceCount' | 'networkAddressCount'> {
    const networkInterfaces = os.networkInterfaces();
    const interfaceNames = Object.keys(networkInterfaces);
    const networkAddressCount = Object.values(networkInterfaces).reduce(
        (count, addresses) => count + (addresses?.length ?? 0),
        0,
    );

    return {
        networkInterfaceCount: interfaceNames.length,
        networkAddressCount,
    };
}

/**
 * Reads Linux traffic counters.
 *
 * @returns Traffic counters or an unavailable result.
 */
async function readLinuxNetworkTrafficCounters(): Promise<NetworkTrafficCounterReadResult> {
    if (process.platform !== 'linux') {
        return {
            counters: null,
            errorMessage: 'Traffic counters are available only on Linux hosts.',
        };
    }

    try {
        const content = await readFile(LINUX_NETWORK_COUNTERS_PATH, 'utf8');
        return {
            counters: parseLinuxNetworkTrafficCounters(content),
            errorMessage: null,
        };
    } catch (error) {
        return {
            counters: null,
            errorMessage: error instanceof Error ? error.message : 'Traffic counters are not available.',
        };
    }
}

/**
 * Parses `/proc/net/dev` content into traffic counters.
 *
 * @param content - Raw `/proc/net/dev` file content.
 * @returns Parsed non-loopback traffic counters.
 */
function parseLinuxNetworkTrafficCounters(content: string): ReadonlyArray<NetworkTrafficCounter> {
    return content
        .split('\n')
        .slice(2)
        .map(parseLinuxNetworkTrafficCounterLine)
        .filter((counter): counter is NetworkTrafficCounter => counter !== null);
}

/**
 * Parses one `/proc/net/dev` interface line.
 *
 * @param line - Raw interface line.
 * @returns Traffic counter or `null` for unsupported lines.
 */
function parseLinuxNetworkTrafficCounterLine(line: string): NetworkTrafficCounter | null {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
        return null;
    }

    const name = line.slice(0, separatorIndex).trim();
    if (!name || name === LOOPBACK_NETWORK_INTERFACE_NAME) {
        return null;
    }

    const fields = line
        .slice(separatorIndex + 1)
        .trim()
        .split(/\s+/);
    const receivedBytes = Number(fields[0]);
    const transmittedBytes = Number(fields[TRANSMITTED_BYTES_FIELD_INDEX]);
    const isCounterValid = Number.isFinite(receivedBytes) && Number.isFinite(transmittedBytes);

    if (!isCounterValid) {
        return null;
    }

    return {
        name,
        receivedBytes,
        transmittedBytes,
    };
}

/**
 * Creates an unavailable network usage snapshot.
 *
 * @param interfaceSummary - Interface/address counts.
 * @param errorMessage - Reason traffic counters are unavailable.
 * @returns Network usage snapshot.
 */
function createUnavailableNetworkResourceUsage(
    interfaceSummary: Pick<NetworkResourceUsage, 'networkInterfaceCount' | 'networkAddressCount'>,
    errorMessage: string | null,
): NetworkResourceUsage {
    return {
        isTrafficAvailable: false,
        interfaces: [],
        totalReceivedBytes: null,
        totalTransmittedBytes: null,
        totalReceivedBytesPerSecond: null,
        totalTransmittedBytesPerSecond: null,
        networkInterfaceCount: interfaceSummary.networkInterfaceCount,
        networkAddressCount: interfaceSummary.networkAddressCount,
        errorMessage,
    };
}

/**
 * Creates an available network usage snapshot.
 *
 * @param options - Counter and sampling options.
 * @returns Network usage snapshot.
 */
function createAvailableNetworkResourceUsage(options: {
    readonly interfaceSummary: Pick<NetworkResourceUsage, 'networkInterfaceCount' | 'networkAddressCount'>;
    readonly counters: ReadonlyArray<NetworkTrafficCounter>;
    readonly previousCounters: ReadonlyArray<NetworkTrafficCounter> | null;
    readonly elapsedSeconds: number | null;
    readonly errorMessage: string | null;
}): NetworkResourceUsage {
    const previousCounterByName = new Map(options.previousCounters?.map((counter) => [counter.name, counter]) ?? []);
    const interfaces = options.counters.map((counter): NetworkInterfaceResourceUsage => {
        const previousCounter = previousCounterByName.get(counter.name);
        const receivedBytesPerSecond =
            previousCounter && options.elapsedSeconds
                ? Math.max(counter.receivedBytes - previousCounter.receivedBytes, 0) / options.elapsedSeconds
                : null;
        const transmittedBytesPerSecond =
            previousCounter && options.elapsedSeconds
                ? Math.max(counter.transmittedBytes - previousCounter.transmittedBytes, 0) / options.elapsedSeconds
                : null;

        return {
            name: counter.name,
            receivedBytes: counter.receivedBytes,
            transmittedBytes: counter.transmittedBytes,
            receivedBytesPerSecond,
            transmittedBytesPerSecond,
        };
    });

    return {
        isTrafficAvailable: true,
        interfaces,
        totalReceivedBytes: interfaces.reduce((sum, item) => sum + item.receivedBytes, 0),
        totalTransmittedBytes: interfaces.reduce((sum, item) => sum + item.transmittedBytes, 0),
        totalReceivedBytesPerSecond: sumNullableRates(interfaces.map((item) => item.receivedBytesPerSecond)),
        totalTransmittedBytesPerSecond: sumNullableRates(interfaces.map((item) => item.transmittedBytesPerSecond)),
        networkInterfaceCount: options.interfaceSummary.networkInterfaceCount,
        networkAddressCount: options.interfaceSummary.networkAddressCount,
        errorMessage: options.errorMessage,
    };
}

/**
 * Sums rates while preserving `null` when no rate was available.
 *
 * @param rates - Nullable rates.
 * @returns Sum or `null`.
 */
function sumNullableRates(rates: ReadonlyArray<number | null>): number | null {
    const availableRates = rates.filter((rate): rate is number => rate !== null);
    if (availableRates.length === 0) {
        return null;
    }

    return availableRates.reduce((sum, rate) => sum + rate, 0);
}
