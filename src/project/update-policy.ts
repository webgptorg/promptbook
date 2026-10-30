import { compareVersions } from '../common/semver.js';

/**
 * A project's engine update policy (`ptbk.json` › `updates`).
 *
 * @private engine self-update
 */
export type UpdatePolicy = {
    /** `updates.isAutoUpdateEnabled` (default true). */
    readonly isAutoUpdateEnabled: boolean;
    /** `updates.versionRange`: an npm-style range or an exact version; omitted means stable minor/patch within the current major. */
    readonly versionRange?: string;
};

/**
 * One comparator of a desugared range (compared against a candidate's base release).
 */
type Comparator = { readonly operator: '<' | '<=' | '>' | '>=' | '='; readonly version: string };

/**
 * A parsed version range: alternatives (`||`) of comparator sets that must all hold; `exact` for a single exact version.
 *
 * @private engine self-update
 */
export type VersionRange = { readonly alternatives: readonly (readonly Comparator[])[]; readonly exact?: string };

/**
 * A partial version (`1`, `1.2`, `1.2.x`, `1.2.3-4`): undefined parts are wildcards.
 */
type Partial = { readonly major?: number; readonly minor?: number; readonly patch?: number; readonly prerelease?: string };

/**
 * Parses one partial version with an optional `v` prefix and `x`/`X`/`*` wildcards (build metadata is ignored).
 */
function parsePartial(text: string): Partial | undefined {
    const match = /^v?(\d+|[xX*])(?:\.(\d+|[xX*])(?:\.(\d+|[xX*])(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?)?)?(?:\+[0-9A-Za-z.-]+)?$/.exec(text);
    if (!match) return undefined;
    const number = (part: string | undefined): number | undefined => (part === undefined || /^[xX*]$/.test(part) ? undefined : Number(part));
    const [major, minor, patch] = [number(match[1]), number(match[2]), number(match[3])];
    // A wildcard makes every later part a wildcard too (`1.x.3` means `1.x`).
    if (major === undefined) return {};
    if (minor === undefined) return { major };
    if (patch === undefined) return { major, minor };
    return { major, minor, patch, prerelease: match[4] };
}

/**
 * The lowest version a partial denotes (`1.2` → `1.2.0`).
 */
function lowest(partial: Partial): string {
    return `${partial.major ?? 0}.${partial.minor ?? 0}.${partial.patch ?? 0}${partial.prerelease ? `-${partial.prerelease}` : ''}`;
}

/**
 * The first version above everything a partial denotes (`1` → `2.0.0`, `1.2` → `1.3.0`); undefined when complete.
 */
function above(partial: Partial): string | undefined {
    if (partial.major === undefined) return undefined;
    if (partial.minor === undefined) return `${partial.major + 1}.0.0`;
    if (partial.patch === undefined) return `${partial.major}.${partial.minor + 1}.0`;
    return undefined;
}

/**
 * Desugars one space-separated range element (an operator may be separated from its version by spaces).
 */
function desugar(operator: string, partial: Partial): Comparator[] | undefined {
    const complete = partial.patch !== undefined;
    switch (operator) {
        case '':
        case '=': {
            if (partial.major === undefined) return [];
            if (complete) return [{ operator: '=', version: lowest(partial) }];
            return [{ operator: '>=', version: lowest(partial) }, { operator: '<', version: above(partial)! }];
        }
        case '~': {
            if (partial.major === undefined) return [];
            const upper = partial.minor === undefined ? `${partial.major + 1}.0.0` : `${partial.major}.${partial.minor + 1}.0`;
            return [{ operator: '>=', version: lowest(partial) }, { operator: '<', version: upper }];
        }
        case '^': {
            if (partial.major === undefined) return [];
            const { major, minor, patch } = partial;
            const upper = major > 0 || minor === undefined ? `${major + 1}.0.0` : minor > 0 || patch === undefined ? `0.${minor + 1}.0` : `0.0.${patch + 1}`;
            return [{ operator: '>=', version: lowest(partial) }, { operator: '<', version: upper }];
        }
        case '>':
            if (partial.major === undefined) return [{ operator: '<', version: '0.0.0' }];
            return complete ? [{ operator: '>', version: lowest(partial) }] : [{ operator: '>=', version: above(partial)! }];
        case '>=':
            return partial.major === undefined ? [] : [{ operator: '>=', version: lowest(partial) }];
        case '<':
            return partial.major === undefined ? [{ operator: '<', version: '0.0.0' }] : [{ operator: '<', version: lowest(partial) }];
        case '<=':
            if (partial.major === undefined) return [];
            return complete ? [{ operator: '<=', version: lowest(partial) }] : [{ operator: '<', version: above(partial)! }];
        default:
            return undefined;
    }
}

/**
 * Parses an npm-style version range: exact versions, partials and `x` wildcards, `~`, `^`, comparators, hyphen ranges
 * (`1.2.3 - 2.3.4`) and `||` alternatives. Returns `undefined` for anything else.
 *
 * @private engine self-update
 */
export function parseVersionRange(text: string): VersionRange | undefined {
    const trimmed = text.trim();
    if (!trimmed) return undefined;
    const alternatives: Comparator[][] = [];
    for (const alternative of trimmed.split('||').map((part) => part.trim())) {
        const hyphen = /^(\S+)\s+-\s+(\S+)$/.exec(alternative);
        if (hyphen) {
            const [from, to] = [parsePartial(hyphen[1]!), parsePartial(hyphen[2]!)];
            if (!from || !to) return undefined;
            const upper = to.major === undefined ? [] : to.patch !== undefined ? [{ operator: '<=' as const, version: lowest(to) }] : [{ operator: '<' as const, version: above(to)! }];
            alternatives.push([...(from.major === undefined ? [] : [{ operator: '>=' as const, version: lowest(from) }]), ...upper]);
            continue;
        }
        const comparators: Comparator[] = [];
        // Join an operator with a following version (`>= 1.2.3`), then read each element.
        const elements = alternative ? alternative.replace(/(<=|>=|<|>|=|\^|~)\s+/g, '$1').split(/\s+/) : ['*'];
        for (const element of elements) {
            const match = /^(<=|>=|<|>|=|\^|~)?(.+)$/.exec(element);
            const partial = match ? parsePartial(match[2]!) : undefined;
            const desugared = partial ? desugar(match![1] ?? '', partial) : undefined;
            if (!desugared) return undefined;
            comparators.push(...desugared);
        }
        alternatives.push(comparators);
    }
    const only = alternatives.length === 1 && alternatives[0]!.length === 1 ? alternatives[0]![0]! : undefined;
    return { alternatives, ...(only?.operator === '=' ? { exact: only.version } : {}) };
}

/**
 * The release a version belongs to: `0.119.0-40` → `0.119.0` (build metadata dropped).
 *
 * @private engine self-update
 */
export function baseRelease(version: string): string {
    return version.trim().replace(/^v/, '').replace(/[-+].*$/, '');
}

/**
 * Whether a version is a prerelease.
 *
 * @private engine self-update
 */
export function isPrerelease(version: string): boolean {
    return /^v?\d+\.\d+\.\d+-/.test(version.trim());
}

/**
 * Whether a range admits a candidate. An exact range admits only that exact version; other ranges are evaluated against
 * the candidate's base release (the explicit prerelease rule: a range never opts a release channel in by itself).
 *
 * @private engine self-update
 */
export function rangeAdmits(range: VersionRange, candidate: string): boolean {
    if (range.exact) return compareVersions(candidate, range.exact) === 0;
    const base = baseRelease(candidate);
    return range.alternatives.some((comparators) =>
        comparators.every((comparator) => {
            const order = compareVersions(base, comparator.version);
            if (order === undefined) return false;
            switch (comparator.operator) {
                case '<':
                    return order < 0;
                case '<=':
                    return order <= 0;
                case '>':
                    return order > 0;
                case '>=':
                    return order >= 0;
                case '=':
                    return order === 0;
            }
        }),
    );
}

/**
 * The automatic update a policy selects for the current installation.
 *
 * @private engine self-update
 */
export type UpdateSelection = {
    /** The version to install, when one is allowed and newer. */
    readonly target?: string;
    /** Why there is (or is not) a target, in words. */
    readonly reason: string;
    /** `disabled`, `pinned` and `invalid` are policy constraints; `none` means nothing newer is allowed. */
    readonly constraint?: 'disabled' | 'pinned' | 'invalid' | 'none';
};

/**
 * Selects the automatic update for `current` among `published` versions under a policy:
 *
 * - a stable installation moves to the newest stable release the range allows (by default within the same major,
 *   including minor releases while the major is zero) and never enters a prerelease automatically;
 * - a prerelease installation advances on its own prerelease line and prefers that line's stable release once it is
 *   published, never crossing into another prerelease base;
 * - an exact pin never moves away from that version (it is only reached when newer than the running one).
 *
 * The default never crosses a major version; an explicit range may. Nothing is ever selected below `current`.
 *
 * @private engine self-update
 */
export function selectUpdate(current: string, published: readonly string[], policy: UpdatePolicy): UpdateSelection {
    if (!policy.isAutoUpdateEnabled) return { reason: 'Automatic updates are off (updates.isAutoUpdateEnabled).', constraint: 'disabled' };
    if (compareVersions(current, current) === undefined) return { reason: `The running version ${current} is not a release version.`, constraint: 'invalid' };
    const range = policy.versionRange === undefined ? undefined : parseVersionRange(policy.versionRange);
    if (policy.versionRange !== undefined && !range) return { reason: `updates.versionRange "${policy.versionRange}" is not a valid version range.`, constraint: 'invalid' };
    const newer = published.filter((version) => (compareVersions(version, current) ?? 0) > 0);
    const newest = (versions: readonly string[]): string | undefined => [...versions].sort((a, b) => compareVersions(b, a) ?? 0)[0];
    if (range?.exact) {
        if (compareVersions(current, range.exact) === 0) return { reason: `Pinned to ${range.exact}.`, constraint: 'pinned' };
        const target = newer.find((version) => compareVersions(version, range.exact!) === 0);
        return target ? { target, reason: `Pinned to ${range.exact}.` } : { reason: `Pinned to ${range.exact}${compareVersions(range.exact, current)! < 0 ? ', older than the running version (never downgraded)' : ', which is not published'}.`, constraint: 'pinned' };
    }
    const admitted = (version: string): boolean => (range ? rangeAdmits(range, version) : baseRelease(version).split('.')[0] === baseRelease(current).split('.')[0]);
    const scope = range ? `allowed by ${policy.versionRange}` : `within major ${baseRelease(current).split('.')[0]}`;
    if (isPrerelease(current)) {
        const line = newer.filter((version) => baseRelease(version) === baseRelease(current) && admitted(version));
        const stable = line.find((version) => !isPrerelease(version));
        if (stable) return { target: stable, reason: `${stable} is the stable release of the running prerelease line.` };
        const target = newest(line);
        return target ? { target, reason: `${target} continues the running prerelease line ${baseRelease(current)}.` } : { reason: `No newer release of the ${baseRelease(current)} prerelease line is published.`, constraint: 'none' };
    }
    const target = newest(newer.filter((version) => !isPrerelease(version) && admitted(version)));
    return target ? { target, reason: `${target} is the newest stable release ${scope}.` } : { reason: `No newer stable release ${scope} is published.`, constraint: 'none' };
}

/**
 * Whether one project's policy permits replacing an installation now at `current` with `target` (used when a shared
 * installation serves several projects: every associated policy must permit the same target).
 *
 * @private engine self-update
 */
export function policyPermits(policy: UpdatePolicy, current: string, target: string): boolean {
    return selectUpdate(current, [target], policy).target === target;
}
