import { KEBAB_IDENTIFIER, kebabIdentifier, matchEnum, matchProperty } from '../common/naming.js';
import { parseEnvironmentReference } from './environment.js';
import {
    AUTHENTICATION_MODES,
    BROWSER_VARIANTS,
    ENDPOINT_KEYWORDS,
    HARNESS_VARIANTS,
    PROFILE_SOURCES,
    SUPERSEDED_HARNESS_FIELDS,
    TOOL_FIELDS,
    TOOL_TYPES,
    type AuthenticationMode,
    type BrowserToolRecord,
    type HarnessToolRecord,
    type ProfileSource,
    type ToolRecord,
    type ToolType,
} from './model.js';

/**
 * One deterministic correction of a noncanonical spelling (never contains secret values).
 *
 * @private tool normalization
 */
export type ConfigCorrection = {
    /** Location such as `tools[0].variant`. */
    readonly location: string;
    /** Original spelling. */
    readonly from: string;
    /** Canonical spelling. */
    readonly to: string;
};

/**
 * A problem that canonicalization cannot resolve deterministically (handed to automatic repair).
 *
 * @private tool normalization
 */
export type ConfigProblem = {
    /** Location such as `ptbk.json › tools[1].name`. */
    readonly location: string;
    readonly message: string;
    readonly severity: 'error' | 'warning';
};

/**
 * Result of parsing `ptbk.json.tools`.
 *
 * @private tool normalization
 */
export type ParsedTools = {
    /** Valid typed records in array order (invalid or colliding entries are excluded, never guessed). */
    readonly tools: readonly ToolRecord[];
    /** The raw array with deterministic corrections applied (unknown fields and invalid entries preserved). */
    readonly canonical: readonly unknown[];
    readonly corrections: readonly ConfigCorrection[];
    readonly problems: readonly ConfigProblem[];
};

/**
 * Field names that look like secrets; only an environment reference may be stored there.
 */
const SECRET_FIELD = /key|token|secret|password/i;

/**
 * Canonicalizes property names of an object against known names, recording corrections and conflicting aliases.
 */
function canonicalKeys(entry: Record<string, unknown>, known: readonly string[], location: string, corrections: ConfigCorrection[], problems: ConfigProblem[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const aliases = new Map<string, string[]>();
    for (const key of Object.keys(entry)) {
        const canonical = matchProperty(key, known) ?? key;
        aliases.set(canonical, [...(aliases.get(canonical) ?? []), key]);
    }
    for (const [canonical, spellings] of aliases) {
        if (spellings.length > 1) {
            problems.push({ location: `${location}.${canonical}`, message: `conflicting spellings ${spellings.map((spelling) => `"${spelling}"`).join(', ')} of the same field (repair needed)`, severity: 'error' });
            for (const spelling of spellings) result[spelling] = entry[spelling];
            continue;
        }
        const spelling = spellings[0]!;
        if (spelling !== canonical) corrections.push({ location: `${location}.${spelling}`, from: spelling, to: canonical });
        result[canonical] = entry[spelling];
    }
    return result;
}

/**
 * Canonicalizes an enum field in place (tolerant input, canonical saved output).
 */
function canonicalEnumField<T extends string>(entry: Record<string, unknown>, field: string, allowed: readonly T[], location: string, corrections: ConfigCorrection[], problems: ConfigProblem[], options: { required?: boolean; describe?: string } = {}): T | undefined {
    const raw = entry[field];
    if (raw === undefined) {
        if (options.required) problems.push({ location: `${location}.${field}`, message: `missing ${options.describe ?? field}`, severity: 'error' });
        return undefined;
    }
    const value = matchEnum(raw, allowed);
    if (!value) {
        problems.push({ location: `${location}.${field}`, message: `unknown ${options.describe ?? field} ${JSON.stringify(raw)} (expected one of ${allowed.join(', ')})`, severity: 'error' });
        return undefined;
    }
    if (value !== raw) {
        corrections.push({ location: `${location}.${field}`, from: String(raw), to: value });
        entry[field] = value;
    }
    return value;
}

/**
 * Reads a boolean field; tolerant `"true"`/`"false"` strings are corrected.
 */
function booleanField(entry: Record<string, unknown>, field: string, fallback: boolean, location: string, corrections: ConfigCorrection[], problems: ConfigProblem[]): boolean {
    const raw = entry[field];
    if (raw === undefined) return fallback;
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'string' && /^(true|false)$/i.test(raw.trim())) {
        const value = raw.trim().toLowerCase() === 'true';
        corrections.push({ location: `${location}.${field}`, from: raw, to: String(value) });
        entry[field] = value;
        return value;
    }
    problems.push({ location: `${location}.${field}`, message: 'expected true or false', severity: 'error' });
    return fallback;
}

/**
 * Parses and canonicalizes `ptbk.json.tools`: tolerant known keys, enum values and tool names; typed validation of
 * each variant's fields; collisions, unknown variants and inline secrets become problems instead of guesses.
 *
 * @private tool normalization
 */
export function parseTools(raw: unknown): ParsedTools {
    const corrections: ConfigCorrection[] = [];
    const problems: ConfigProblem[] = [];
    if (raw === undefined) return { tools: [], canonical: [], corrections, problems };
    if (!Array.isArray(raw)) {
        problems.push({ location: 'ptbk.json › tools', message: 'expected an ordered array of tool records', severity: 'error' });
        return { tools: [], canonical: [], corrections, problems };
    }
    const canonical: unknown[] = [];
    const candidates: Array<{ index: number; record: ToolRecord; rawName: string }> = [];
    raw.forEach((value, index) => {
        const location = `ptbk.json › tools[${index}]`;
        if (value === null || typeof value !== 'object' || Array.isArray(value)) {
            problems.push({ location, message: 'expected a tool object', severity: 'error' });
            canonical.push(value);
            return;
        }
        const pending: ConfigCorrection[] = [];
        const original = value as Record<string, unknown>;
        const typeKey = Object.keys(original).find((key) => matchProperty(key, ['type']) === 'type');
        const type = matchEnum(typeKey ? original[typeKey] : undefined, TOOL_TYPES) as ToolType | undefined;
        const entry = canonicalKeys(original, type ? TOOL_FIELDS[type] : TOOL_FIELDS.HARNESS.concat(TOOL_FIELDS.BROWSER.slice(5)), location, pending, problems);
        const resolvedType = canonicalEnumField(entry, 'type', TOOL_TYPES, location, pending, problems, { required: true, describe: 'tool type' });
        const variant = resolvedType ? canonicalEnumField(entry, 'variant', resolvedType === 'BROWSER' ? BROWSER_VARIANTS : HARNESS_VARIANTS, location, pending, problems, { required: true, describe: `${resolvedType.toLowerCase()} variant` }) : undefined;
        let name: string | undefined;
        const rawName = entry.name;
        if (typeof rawName !== 'string' || !rawName.trim()) problems.push({ location: `${location}.name`, message: 'missing tool name', severity: 'error' });
        else if (KEBAB_IDENTIFIER.test(rawName)) name = rawName;
        else {
            name = kebabIdentifier(rawName);
            if (name) pending.push({ location: `${location}.name`, from: rawName, to: name });
            else problems.push({ location: `${location}.name`, message: `"${rawName}" cannot be turned into a kebab-case tool name`, severity: 'error' });
        }
        const isEnabled = booleanField(entry, 'isEnabled', true, location, pending, problems);
        if (entry.description !== undefined && typeof entry.description !== 'string') problems.push({ location: `${location}.description`, message: 'expected free text', severity: 'error' });
        const known = resolvedType ? TOOL_FIELDS[resolvedType] : [];
        for (const key of Object.keys(entry)) {
            if (known.includes(key)) continue;
            const otherType = resolvedType && TOOL_FIELDS[resolvedType === 'BROWSER' ? 'HARNESS' : 'BROWSER'].includes(key);
            if (SECRET_FIELD.test(key) && parseEnvironmentReference(entry[key]) === undefined) {
                problems.push({ location: `${location}.${key}`, message: 'store credential references (${{ env.NAME }}), never secret values', severity: 'error' });
            } else if (resolvedType === 'HARNESS' && (SUPERSEDED_HARNESS_FIELDS as readonly string[]).includes(key)) {
                problems.push({
                    location: `${location}.${key}`,
                    message: 'superseded per-tool model setting (preserved, ignored): harness plugins own model/thinking defaults and MODEL in agent/task Books states requirements; the project migration converts it',
                    severity: 'warning',
                });
            } else {
                problems.push({ location: `${location}.${key}`, message: otherType ? `"${key}" does not apply to a ${resolvedType} tool` : 'unknown tool field (preserved, ignored)', severity: otherType ? 'error' : 'warning' });
            }
        }
        let record: ToolRecord | undefined;
        if (resolvedType === 'BROWSER' && variant) record = parseBrowserFields(entry, location, pending, problems, { name, isEnabled, variant: variant as BrowserToolRecord['variant'] });
        else if (resolvedType === 'HARNESS' && variant) record = parseHarnessFields(entry, location, pending, problems, { name, isEnabled, variant: variant as HarnessToolRecord['variant'] });
        corrections.push(...pending);
        if (name && record) {
            entry.name = name;
            candidates.push({ index, record, rawName: String(rawName) });
        }
        canonical.push(entry);
    });
    // Names compare canonically; two entries normalizing to the same identifier are a repair problem, never renamed.
    const byName = new Map<string, typeof candidates>();
    for (const candidate of candidates) byName.set(candidate.record.name, [...(byName.get(candidate.record.name) ?? []), candidate]);
    const tools: ToolRecord[] = [];
    for (const candidate of candidates) {
        const group = byName.get(candidate.record.name)!;
        if (group.length > 1) {
            if (group[0] === candidate) {
                problems.push({
                    location: `ptbk.json › tools[${group.map((item) => item.index).join(', ')}].name`,
                    message: `${group.length} tools share the name "${candidate.record.name}" (${group.map((item) => JSON.stringify(item.rawName)).join(', ')}); none of them is used until the names are made distinct`,
                    severity: 'error',
                });
                // Do not apply name corrections that would merge distinct spellings into one identifier.
                for (const item of group) {
                    const entry = canonical[item.index] as Record<string, unknown>;
                    entry.name = item.rawName;
                    const index = corrections.findIndex((correction) => correction.location === `ptbk.json › tools[${item.index}].name`);
                    if (index >= 0) corrections.splice(index, 1);
                }
            }
            continue;
        }
        tools.push(candidate.record);
    }
    return { tools, canonical, corrections, problems };
}

/**
 * Typed fields of a browser record.
 */
function parseBrowserFields(entry: Record<string, unknown>, location: string, corrections: ConfigCorrection[], problems: ConfigProblem[], common: { name?: string; isEnabled: boolean; variant: BrowserToolRecord['variant'] }): BrowserToolRecord | undefined {
    let profile: BrowserToolRecord['profile'] = { source: 'MANAGED_GLOBAL' };
    let valid = true;
    if (entry.profile !== undefined) {
        if (entry.profile === null || typeof entry.profile !== 'object' || Array.isArray(entry.profile)) {
            problems.push({ location: `${location}.profile`, message: 'expected an object with source (and path)', severity: 'error' });
            valid = false;
        } else {
            const profileEntry = canonicalKeys(entry.profile as Record<string, unknown>, ['source', 'path'], `${location}.profile`, corrections, problems);
            entry.profile = profileEntry;
            const source = canonicalEnumField(profileEntry, 'source', PROFILE_SOURCES, `${location}.profile`, corrections, problems, { required: true, describe: 'profile source' }) as ProfileSource | undefined;
            const path = profileEntry.path;
            if (path !== undefined && (typeof path !== 'string' || !path.trim())) {
                problems.push({ location: `${location}.profile.path`, message: 'expected a nonempty path', severity: 'error' });
                valid = false;
            }
            if (source === 'CUSTOM' && typeof path !== 'string') {
                problems.push({ location: `${location}.profile.path`, message: 'a CUSTOM profile requires its path', severity: 'error' });
                valid = false;
            }
            if (!source) valid = false;
            else profile = { source, ...(typeof path === 'string' && path.trim() ? { path } : {}) };
        }
    }
    const isHeadless = booleanField(entry, 'isHeadless', true, location, corrections, problems);
    if (entry.executable !== undefined && (typeof entry.executable !== 'string' || !entry.executable.trim())) {
        problems.push({ location: `${location}.executable`, message: 'expected a nonempty executable path or name', severity: 'error' });
        valid = false;
    }
    if (!common.name || !valid) return undefined;
    return {
        type: 'BROWSER',
        variant: common.variant,
        name: common.name,
        ...(typeof entry.description === 'string' ? { description: entry.description } : {}),
        isEnabled: common.isEnabled,
        profile,
        isHeadless,
        ...(typeof entry.executable === 'string' ? { executable: entry.executable } : {}),
    };
}

/**
 * Typed fields of a harness record.
 */
function parseHarnessFields(entry: Record<string, unknown>, location: string, corrections: ConfigCorrection[], problems: ConfigProblem[], common: { name?: string; isEnabled: boolean; variant: HarnessToolRecord['variant'] }): HarnessToolRecord | undefined {
    let valid = true;
    const authentication = (canonicalEnumField(entry, 'authentication', AUTHENTICATION_MODES, location, corrections, problems, { describe: 'authentication' }) as AuthenticationMode | undefined) ?? (entry.authentication === undefined ? 'NATIVE' : undefined);
    if (!authentication) valid = false;
    const apiKey = entry.apiKey;
    if (apiKey !== undefined) {
        if (parseEnvironmentReference(apiKey) === undefined) {
            // The secret is never echoed: only its location is reported.
            problems.push({ location: `${location}.apiKey`, message: 'apiKey must be an environment reference such as ${{ env.OPENAI_API_KEY }}; inline credential values are invalid', severity: 'error' });
            valid = false;
        }
    }
    if (authentication === 'API_KEY' && apiKey === undefined) {
        problems.push({ location: `${location}.apiKey`, message: 'an API_KEY tool requires apiKey: "${{ env.NAME }}"', severity: 'error' });
        valid = false;
    }
    if (entry.accountProfile !== undefined && (typeof entry.accountProfile !== 'string' || !entry.accountProfile.trim())) {
        problems.push({ location: `${location}.accountProfile`, message: 'expected a nonempty string', severity: 'error' });
        valid = false;
    }
    if (typeof entry.accountProfile === 'string' && !KEBAB_IDENTIFIER.test(entry.accountProfile)) {
        const fixed = kebabIdentifier(entry.accountProfile);
        if (fixed) {
            corrections.push({ location: `${location}.accountProfile`, from: entry.accountProfile, to: fixed });
            entry.accountProfile = fixed;
        }
    }
    const baseUrl = parseBaseUrl(entry, location, corrections, problems);
    if (baseUrl === null) valid = false;
    if (!common.name || !valid || !authentication) return undefined;
    return {
        type: 'HARNESS',
        variant: common.variant,
        name: common.name,
        ...(typeof entry.description === 'string' ? { description: entry.description } : {}),
        isEnabled: common.isEnabled,
        authentication,
        ...(typeof apiKey === 'string' ? { apiKey } : {}),
        ...(typeof entry.accountProfile === 'string' ? { accountProfile: entry.accountProfile } : {}),
        ...(baseUrl ? { baseUrl } : {}),
    };
}

/**
 * Reads a harness endpoint: `OFFICIAL`, `LOCAL` (any case, saved canonically) or an http(s) base URL without
 * credentials. Returns `null` for an invalid value.
 *
 * @private tool normalization
 */
export function parseBaseUrl(entry: Record<string, unknown>, location: string, corrections: ConfigCorrection[], problems: ConfigProblem[]): string | undefined | null {
    const raw = entry.baseUrl;
    if (raw === undefined) return undefined;
    if (typeof raw !== 'string' || !raw.trim()) {
        problems.push({ location: `${location}.baseUrl`, message: 'expected OFFICIAL, LOCAL or an http(s) base URL', severity: 'error' });
        return null;
    }
    const keyword = matchEnum(raw, ENDPOINT_KEYWORDS);
    if (keyword) {
        if (keyword !== raw) {
            corrections.push({ location: `${location}.baseUrl`, from: raw, to: keyword });
            entry.baseUrl = keyword;
        }
        return keyword;
    }
    if (/^default$/i.test(raw.trim())) {
        problems.push({ location: `${location}.baseUrl`, message: 'baseUrl is the concrete endpoint; omit it for the default (official) endpoint — `runtime=default` belongs to MODEL', severity: 'error' });
        return null;
    }
    try {
        const url = new URL(raw.trim());
        if (!/^https?:$/.test(url.protocol)) throw new Error('not http(s)');
        if (url.username || url.password) {
            // The credential is never echoed: only its location is reported.
            problems.push({ location: `${location}.baseUrl`, message: 'the base URL must not contain credentials; keep secrets in .env', severity: 'error' });
            return null;
        }
    } catch {
        problems.push({ location: `${location}.baseUrl`, message: `expected OFFICIAL, LOCAL or an http(s) base URL (got ${JSON.stringify(raw)})`, severity: 'error' });
        return null;
    }
    return raw.trim();
}

/**
 * Serializes a typed record canonically, keeping unknown extension fields of its previous raw entry.
 *
 * @private tool normalization
 */
export function serializeTool(record: ToolRecord, previous?: Readonly<Record<string, unknown>>): Record<string, unknown> {
    const known = TOOL_FIELDS[record.type];
    const result: Record<string, unknown> = { type: record.type, variant: record.variant, name: record.name };
    if (record.description !== undefined) result.description = record.description;
    result.isEnabled = record.isEnabled;
    if (record.type === 'BROWSER') {
        result.profile = { source: record.profile.source, ...(record.profile.path !== undefined ? { path: record.profile.path } : {}) };
        result.isHeadless = record.isHeadless;
        if (record.executable !== undefined) result.executable = record.executable;
    } else {
        result.authentication = record.authentication;
        if (record.apiKey !== undefined) result.apiKey = record.apiKey;
        if (record.accountProfile !== undefined) result.accountProfile = record.accountProfile;
        if (record.baseUrl !== undefined) result.baseUrl = record.baseUrl;
    }
    for (const [key, value] of Object.entries(previous ?? {})) {
        if (!known.includes(key) && !matchProperty(key, known)) result[key] = value;
    }
    return result;
}
