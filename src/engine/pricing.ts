import { appendFile, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ensureDirectory } from '../common/fs.js';
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
