/**
 * Groups rows by a computed key.
 *
 * @param rows - Rows to group.
 * @param getKey - Key selector.
 * @returns Grouped rows keyed by the computed value.
 *
 * @private function of `createServerBackupZipStream`
 */
export function groupRowsBy<Row, Key extends string | number>(
    rows: ReadonlyArray<Row>,
    getKey: (row: Row) => Key,
): Map<Key, Array<Row>> {
    const rowsByKey = new Map<Key, Array<Row>>();

    for (const row of rows) {
        const key = getKey(row);
        const groupedRows = rowsByKey.get(key) || [];
        groupedRows.push(row);
        rowsByKey.set(key, groupedRows);
    }

    return rowsByKey;
}

/**
 * Converts one unknown persisted message array into serializable objects.
 *
 * @param value - Raw message array candidate.
 * @returns Serializable message array.
 *
 * @private function of `createServerBackupZipStream`
 */
export function resolveSerializableArray(value: unknown): Array<Record<string, unknown>> {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.filter(isRecord);
}

/**
 * Type guard for plain objects used throughout the backup builders.
 *
 * @param value - Unknown value.
 * @returns `true` when the value is a non-array object.
 *
 * @private function of `createServerBackupZipStream`
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Deduplicates JSON-serializable objects using their serialized representation.
 *
 * @param values - Serializable objects.
 * @returns Deduplicated object list in first-seen order.
 *
 * @private function of `createServerBackupZipStream`
 */
export function deduplicateSerializableObjects<Value extends object>(values: ReadonlyArray<Value>): Array<Value> {
    const seenSerializedValues = new Set<string>();
    const deduplicatedValues: Array<Value> = [];

    for (const value of values) {
        const serializedValue = JSON.stringify(value);
        if (seenSerializedValues.has(serializedValue)) {
            continue;
        }

        seenSerializedValues.add(serializedValue);
        deduplicatedValues.push(value);
    }

    return deduplicatedValues;
}

/**
 * Normalizes one optional text field to a trimmed string or `null`.
 *
 * @param value - Raw value.
 * @returns Trimmed text or `null`.
 *
 * @private function of `createServerBackupZipStream`
 */
export function normalizeOptionalText(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const normalizedValue = value.trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
}

/**
 * Sorts exported rows so JSON files remain stable and easier to diff.
 *
 * @param rows - Raw table rows fetched from Supabase.
 * @returns Sorted shallow-cloned row list.
 *
 * @private function of `createServerBackupZipStream`
 */
export function sortBackupRows(rows: ReadonlyArray<Record<string, unknown>>): Array<Record<string, unknown>> {
    return [...rows].sort(compareBackupRows);
}

/**
 * Compares two generic backup rows using the most common stable identifier fields.
 *
 * @param left - First row.
 * @param right - Second row.
 * @returns Stable ordering for backup JSON output.
 *
 * @private function of `createServerBackupZipStream`
 */
function compareBackupRows(left: Record<string, unknown>, right: Record<string, unknown>): number {
    const comparableKeys = ['sortOrder', 'id', 'key', 'username', 'agentName', 'permanentId', 'messageHash', 'createdAt'];

    for (const comparableKey of comparableKeys) {
        const comparison = compareComparableValues(left[comparableKey], right[comparableKey]);

        if (comparison !== 0) {
            return comparison;
        }
    }

    return JSON.stringify(left).localeCompare(JSON.stringify(right));
}

/**
 * Compares one optional pair of identifier values.
 *
 * @param left - First value.
 * @param right - Second value.
 * @returns Comparison result compatible with `Array.sort`.
 *
 * @private function of `createServerBackupZipStream`
 */
function compareComparableValues(left: unknown, right: unknown): number {
    if (left === right) {
        return 0;
    }

    if (typeof left === 'number' && typeof right === 'number') {
        return left - right;
    }

    if (left === undefined || left === null) {
        return 1;
    }

    if (right === undefined || right === null) {
        return -1;
    }

    return String(left).localeCompare(String(right));
}
