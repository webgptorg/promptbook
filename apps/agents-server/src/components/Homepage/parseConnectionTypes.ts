import { CONNECTION_TYPES, DEFAULT_CONNECTION_TYPES, type ConnectionType } from './buildGraphDataTypes';

/**
 * Check if a capability type is a graph connection type.
 */
const isConnectionType = (value: string): value is ConnectionType => CONNECTION_TYPES.includes(value as ConnectionType);

/**
 * Parse URL query parameters into a list of connection types.
 *
 * @private function of AgentsGraph
 */
export const parseConnectionTypes = (value: string | null): ConnectionType[] => {
    if (!value) {
        return DEFAULT_CONNECTION_TYPES;
    }

    const selected = value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => isConnectionType(item)) as ConnectionType[];

    return selected.length > 0 ? selected : DEFAULT_CONNECTION_TYPES;
};
