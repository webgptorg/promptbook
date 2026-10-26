/**
 * Parsed semantic version.
 */
type ParsedVersion = {
    readonly core: readonly [string, string, string];
    readonly prerelease: readonly string[];
};

/**
 * Parses `1.2.3`, `v1.2.3-4`, `1.2.3-beta.1+build`; returns `undefined` for anything else.
 */
function parseVersion(version: string): ParsedVersion | undefined {
    const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(version.trim());
    if (!match) return undefined;
    const prerelease = match[4] ? match[4].split('.') : [];
    if (prerelease.some((identifier) => /^0\d+$/.test(identifier))) return undefined;
    return { core: [match[1]!, match[2]!, match[3]!], prerelease };
}

/**
 * Compares validated nonnegative decimal identifiers without losing precision to JavaScript numbers.
 */
function compareNumericIdentifiers(left: string, right: string): number {
    return Math.sign(left.length - right.length) || (left === right ? 0 : left < right ? -1 : 1);
}

/**
 * Extracts the first semantic version found in a text (e.g. `codex-cli 0.162.1`).
 *
 * @private shared version helper
 */
export function extractVersion(text: string): string | undefined {
    return /\bv?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)\b/.exec(text)?.[1];
}

/**
 * Compares two versions with semver precedence; returns `undefined` when either is not a version.
 *
 * @private shared version helper
 */
export function compareVersions(a: string, b: string): number | undefined {
    const left = parseVersion(a);
    const right = parseVersion(b);
    if (!left || !right) return undefined;
    for (let index = 0; index < 3; index++) {
        const difference = compareNumericIdentifiers(left.core[index]!, right.core[index]!);
        if (difference !== 0) return difference;
    }
    if (!left.prerelease.length && !right.prerelease.length) return 0;
    if (!left.prerelease.length) return 1;
    if (!right.prerelease.length) return -1;
    const length = Math.max(left.prerelease.length, right.prerelease.length);
    for (let index = 0; index < length; index++) {
        const l = left.prerelease[index];
        const r = right.prerelease[index];
        if (l === undefined) return -1;
        if (r === undefined) return 1;
        const isLeftNumeric = /^\d+$/.test(l);
        const isRightNumeric = /^\d+$/.test(r);
        if (isLeftNumeric && isRightNumeric) {
            const difference = compareNumericIdentifiers(l, r);
            if (difference !== 0) return difference;
        } else if (isLeftNumeric) return -1;
        else if (isRightNumeric) return 1;
        else if (l !== r) return l < r ? -1 : 1;
    }
    return 0;
}

/**
 * Checks whether `candidate` is strictly newer than `current`.
 *
 * @private shared version helper
 */
export function isNewerVersion(candidate: string, current: string): boolean {
    return (compareVersions(candidate, current) ?? 0) > 0;
}
