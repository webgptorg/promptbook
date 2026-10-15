/**
 * Parsed semantic version.
 */
type ParsedVersion = {
    readonly core: [number, number, number];
    readonly prerelease: readonly string[];
};

/**
 * Parses `1.2.3`, `v1.2.3-4`, `1.2.3-beta.1+build`; returns `undefined` for anything else.
 */
function parseVersion(version: string): ParsedVersion | undefined {
    const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(version.trim());
    if (!match) return undefined;
    return { core: [Number(match[1]), Number(match[2]), Number(match[3])], prerelease: match[4] ? match[4].split('.') : [] };
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
        const difference = left.core[index]! - right.core[index]!;
        if (difference !== 0) return Math.sign(difference);
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
        const ln = /^\d+$/.test(l) ? Number(l) : undefined;
        const rn = /^\d+$/.test(r) ? Number(r) : undefined;
        if (ln !== undefined && rn !== undefined) {
            if (ln !== rn) return Math.sign(ln - rn);
        } else if (ln !== undefined) return -1;
        else if (rn !== undefined) return 1;
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
