import { appendFile, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { errorMessage } from '../common/errors.js';
import { ensureDirectory } from '../common/fs.js';
import type { HarnessPlugin, HarnessPriceList } from '../harness/types.js';
import type { Project } from '../project/workspace.js';
import type { UsageCategories, UsageUnit } from './usage.js';

/**
 * Versioned schema of one price-list observation.
 *
 * @private historical pricing
 */
export const PRICE_SCHEMA = 'ptbk-price/1';

/**
 * Rates of one model in currency units per million tokens (absent: not published, never assumed zero).
 *
 * @private historical pricing
 */
export type ModelRates = { readonly [Category in Exclude<keyof UsageCategories, 'total'>]?: number };

/**
 * One timestamped observation of a harness's current price list, stored independently of usage under ignored
 * `.ptbk/pricing/`. The observation time is not proof of when an earlier price changed; effective dates are kept
 * when the source supplies them.
 *
 * @private historical pricing
 */
export type PriceObservation = {
    readonly schema: typeof PRICE_SCHEMA;
    readonly harness: string;
    readonly observedAt: string;
    /** Where the list came from (URL or description). */
    readonly source: string;
    readonly currency: string;
    readonly effectiveFrom?: string;
    readonly effectiveTo?: string;
    /** Rates by model. */
    readonly rates: Readonly<Record<string, ModelRates>>;
};

/**
 * How well a rate is known for the consumption time: `effective` (the source's effective dates cover it), `observed`
 * (the latest observation made before it), `estimated` (only later observations exist: a labelled estimate, never a
 * claim that today's rate applied then).
 *
 * @private historical pricing
 */
export type RateCertainty = 'effective' | 'observed' | 'estimated';

/**
 * The shared public catalog of current token prices (the adapters choose their sections of it).
 * `PTBK_PRICE_LISTS` overrides it or turns the fetching `off`.
 */
const PRICE_CATALOG_URL = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';

/**
 * How long one catalog download may take.
 */
const PRICE_FETCH_TIMEOUT_MS = 20_000;

/**
 * Largest catalog accepted (it is only ever read as data).
 */
const PRICE_CATALOG_MAX_BYTES = 32 * 1024 * 1024;

/**
 * How often the current price lists are observed.
 */
const PRICE_OBSERVATION_INTERVAL_MS = 24 * 3_600_000;

/**
 * When to try again after an unavailable catalog.
 */
const PRICE_RETRY_INTERVAL_MS = 3 * 3_600_000;

/**
 * Catalog fields of each rate, in currency units per token.
 */
const CATALOG_RATE_FIELDS: Readonly<Record<keyof ModelRates, string>> = {
    input: 'input_cost_per_token',
    output: 'output_cost_per_token',
    cachedInput: 'cache_read_input_token_cost',
    cacheWrite: 'cache_creation_input_token_cost',
    reasoning: 'output_cost_per_reasoning_token',
};

/**
 * Catalog entries that are text models (absent: not declared); embedding, image or audio prices are other units.
 */
const CATALOG_TEXT_MODES: ReadonlySet<unknown> = new Set([undefined, 'chat', 'responses', 'completion']);

/**
 * What one observation pass did.
 *
 * @private historical pricing
 */
export type PriceListOutcome = { readonly kind: 'not-due' | 'off' } | { readonly kind: 'observed'; readonly recorded: readonly string[]; readonly unchanged: readonly string[] } | { readonly kind: 'unavailable'; readonly reason: string };

/**
 * Directory of the price observations.
 */
function pricingDirectory(project: Pick<Project, 'runtime'>): string {
    return join(project.runtime.root, 'pricing');
}

/**
 * Retains one more observation (append-only; earlier observations are never rewritten or repriced).
 *
 * @private historical pricing
 */
export async function recordPriceObservation(project: Pick<Project, 'runtime'>, observation: Omit<PriceObservation, 'schema'>): Promise<void> {
    const directory = pricingDirectory(project);
    await ensureDirectory(directory);
    await appendFile(join(directory, `${observation.harness.replace(/[^a-z0-9-]/gi, '_')}.jsonl`), `${JSON.stringify({ schema: PRICE_SCHEMA, ...observation })}\n`);
}

/**
 * Reads every retained price observation (malformed lines are skipped).
 *
 * @private historical pricing
 */
export async function readPriceObservations(project: Pick<Project, 'runtime'>): Promise<PriceObservation[]> {
    const directory = pricingDirectory(project);
    const observations: PriceObservation[] = [];
    for (const name of await readdir(directory).catch(() => [])) {
        if (!name.endsWith('.jsonl')) continue;
        for (const line of (await readFile(join(directory, name), 'utf8').catch(() => '')).split('\n')) {
            if (!line.trim()) continue;
            try {
                const observation = JSON.parse(line) as PriceObservation;
                if (observation.schema === PRICE_SCHEMA) observations.push(observation);
            } catch {
                // A torn line is not an observation.
            }
        }
    }
    return observations;
}

/**
 * The rates per million tokens of a harness's models in the public catalog: only complete text-model entries of its
 * provider sections, under the names the harness reports. Anything else in the catalog is ignored.
 *
 * @private historical pricing
 */
export function ratesFromCatalog(catalog: unknown, list: HarnessPriceList): Record<string, ModelRates> {
    const rates: Record<string, ModelRates> = {};
    if (typeof catalog !== 'object' || catalog === null) return rates;
    for (const [name, entry] of Object.entries(catalog as Record<string, Record<string, unknown>>).sort(([a], [b]) => a.localeCompare(b))) {
        if (typeof entry !== 'object' || entry === null || !CATALOG_TEXT_MODES.has(entry.mode)) continue;
        const provider = list.providers.find((candidate) => candidate.catalog === entry.litellm_provider);
        if (!provider) continue;
        const model: { -readonly [Category in keyof ModelRates]: number } = {};
        for (const [category, field] of Object.entries(CATALOG_RATE_FIELDS) as ReadonlyArray<[keyof ModelRates, string]>) {
            const perToken = entry[field];
            if (typeof perToken === 'number' && Number.isFinite(perToken) && perToken >= 0) model[category] = Math.round(perToken * 1e12) / 1e6;
        }
        if (model.input === undefined || model.output === undefined) continue;
        const bare = name.startsWith(`${provider.catalog}/`) ? name.slice(provider.catalog.length + 1) : name;
        for (const prefix of provider.modelPrefixes ?? ['']) rates[`${prefix}${bare}`] = model;
    }
    return rates;
}

/**
 * Downloads the catalog (bounded in time and size).
 */
async function fetchPriceCatalog(url: string): Promise<unknown> {
    const response = await fetch(url, { signal: AbortSignal.timeout(PRICE_FETCH_TIMEOUT_MS), redirect: 'follow' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    if (text.length > PRICE_CATALOG_MAX_BYTES) throw new Error('the price list is unexpectedly large');
    return JSON.parse(text) as unknown;
}

/**
 * Observes the current price list of each given harness once it is due, keeping a new timestamped observation only
 * when its rates changed since the last one (`rateAt` finds the same rate either way, and a year of identical lists
 * adds nothing). A failure records nothing and never touches usage: its prices stay unknown until a later attempt.
 *
 * @private historical pricing
 */
export async function observePriceLists(project: Pick<Project, 'runtime'>, plugins: readonly HarnessPlugin[], options: { readonly env?: NodeJS.ProcessEnv; readonly now?: number } = {}): Promise<PriceListOutcome> {
    const configured = options.env?.PTBK_PRICE_LISTS?.trim();
    if (configured === 'off') return { kind: 'off' };
    const now = options.now ?? Date.now();
    const listed = plugins.filter((plugin) => plugin.priceList);
    const directory = pricingDirectory(project);
    const scheduleFile = join(directory, 'next-observation.json');
    const nextAt = await readFile(scheduleFile, 'utf8').then(
        (text) => Date.parse((JSON.parse(text) as { at?: string }).at ?? ''),
        () => NaN,
    );
    if (!listed.length || nextAt > now) return { kind: 'not-due' };
    await ensureDirectory(directory);
    const schedule = async (delay: number): Promise<void> => await writeFile(scheduleFile, `${JSON.stringify({ at: new Date(now + delay).toISOString() })}\n`);
    let catalog: unknown;
    try {
        catalog = await fetchPriceCatalog(configured || PRICE_CATALOG_URL);
    } catch (error) {
        await schedule(PRICE_RETRY_INTERVAL_MS);
        return { kind: 'unavailable', reason: errorMessage(error) };
    }
    const observations = await readPriceObservations(project);
    const recorded: string[] = [];
    const unchanged: string[] = [];
    for (const plugin of listed) {
        const rates = ratesFromCatalog(catalog, plugin.priceList!);
        if (!Object.keys(rates).length) continue;
        const latest = observations.filter((observation) => observation.harness === plugin.id).sort((a, b) => a.observedAt.localeCompare(b.observedAt)).pop();
        if (latest && JSON.stringify(latest.rates) === JSON.stringify(rates)) {
            unchanged.push(plugin.id);
            continue;
        }
        await recordPriceObservation(project, { harness: plugin.id, observedAt: new Date(now).toISOString(), source: configured || PRICE_CATALOG_URL, currency: 'USD', rates });
        recorded.push(plugin.id);
    }
    await schedule(PRICE_OBSERVATION_INTERVAL_MS);
    return { kind: 'observed', recorded, unchanged };
}

/**
 * The rate of a model valid when the consumption happened: explicit effective ranges first, otherwise the latest
 * observation made before it; only when every observation is later, the earliest one as a labelled estimate. A later
 * reduction never reprices earlier consumption.
 *
 * @private historical pricing
 */
export function rateAt(observations: readonly PriceObservation[], harness: string, model: string | undefined, at: string): { readonly rates: ModelRates; readonly currency: string; readonly certainty: RateCertainty } | undefined {
    if (!model) return undefined;
    const candidates = observations.filter((observation) => observation.harness === harness && observation.rates[model]).sort((a, b) => a.observedAt.localeCompare(b.observedAt));
    const effective = candidates.filter((observation) => observation.effectiveFrom && observation.effectiveFrom <= at && (!observation.effectiveTo || at < observation.effectiveTo)).sort((a, b) => (a.effectiveFrom ?? '').localeCompare(b.effectiveFrom ?? '')).pop();
    if (effective) return { rates: effective.rates[model]!, currency: effective.currency, certainty: 'effective' };
    const before = candidates.filter((observation) => observation.observedAt <= at && (!observation.effectiveFrom || observation.effectiveFrom <= at)).pop();
    if (before) return { rates: before.rates[model]!, currency: before.currency, certainty: 'observed' };
    const later = candidates[0];
    return later ? { rates: later.rates[model]!, currency: later.currency, certainty: 'estimated' } : undefined;
}

/**
 * The calculated token price of one consumption unit at the rate valid then (`undefined` when its usage or the rate
 * is unknown). For subscription work it is an explicitly labelled token-price equivalent, never an API charge.
 * Cached input already included in input is priced once, at the cached rate where one is published.
 *
 * @private historical pricing
 */
export function priceOf(unit: UsageUnit, observations: readonly PriceObservation[], included?: { readonly cachedInInput?: boolean }): { readonly amount: number; readonly currency: string; readonly certainty: RateCertainty } | undefined {
    if (unit.certainty !== 'reported') return undefined;
    const rate = rateAt(observations, unit.harness, unit.model, unit.at);
    if (!rate) return undefined;
    const { input = 0, output = 0, cachedInput = 0, cacheWrite = 0 } = unit.categories;
    const cachedRate = rate.rates.cachedInput ?? rate.rates.input;
    const uncachedInput = included?.cachedInInput ? Math.max(0, input - cachedInput) : input;
    if (rate.rates.input === undefined || rate.rates.output === undefined) return undefined;
    const amount = (uncachedInput * rate.rates.input + cachedInput * (cachedRate ?? 0) + cacheWrite * (rate.rates.cacheWrite ?? rate.rates.input) + output * rate.rates.output) / 1_000_000;
    return { amount, currency: rate.currency, certainty: rate.certainty };
}
