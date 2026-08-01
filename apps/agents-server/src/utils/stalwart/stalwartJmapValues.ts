/**
 * A Stalwart `set` property, for example a domain alias list or the stages of an MTA hook.
 *
 * Stalwart serializes sets as an object keyed by the member value, **not** as a JSON array.
 */
export type StalwartJmapSet = Readonly<Record<string, true>>;

/**
 * A Stalwart `objectList` property, for example account credentials or expression matches.
 *
 * Stalwart serializes object lists as an object keyed by the decimal item index, **not** as a JSON array.
 */
export type StalwartJmapObjectList<TItem> = Readonly<Record<string, TItem>>;

/**
 * Builds the Stalwart wire representation of a `set` property.
 *
 * Sending a JSON array instead makes Stalwart reject the whole method call with
 * `invalidPatch` / `Invalid value for object property`.
 */
export function toStalwartJmapSet(values: ReadonlyArray<string>): StalwartJmapSet {
    return Object.fromEntries(values.map((value) => [value, true])) as StalwartJmapSet;
}

/**
 * Builds the Stalwart wire representation of an `objectList` property.
 *
 * Sending a JSON array instead makes Stalwart reject the whole method call with
 * `invalidPatch` / `Invalid value for object property`.
 */
export function toStalwartJmapObjectList<TItem>(items: ReadonlyArray<TItem>): StalwartJmapObjectList<TItem> {
    return Object.fromEntries(items.map((item, index) => [String(index), item]));
}
