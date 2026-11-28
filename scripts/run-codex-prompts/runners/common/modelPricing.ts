import { UnexpectedError } from '../../../../src/errors/UnexpectedError';
import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';

/**
 * Price of one model per 1 million tokens in USD.
 */
export type ModelPricing = {
    /**
     * Price of 1 million input tokens in USD.
     */
    readonly input: number;

    /**
     * Price of 1 million output tokens in USD.
     */
    readonly output: number;
};

/**
 * Pricing of all known models of one harness, keyed by the model identifier.
 */
export type ModelPricingTable = Readonly<Record<string, ModelPricing>>;

/**
 * Options for resolving the pricing of one model.
 */
export type ResolveModelPricingOptions = {
    /**
     * Pricing of all models known to one harness.
     */
    readonly pricingTable: ModelPricingTable;

    /**
     * Model whose pricing is used when the requested model is unknown.
     */
    readonly modelNameForEstimation: string;

    /**
     * Model requested for the run, or `undefined` when the harness picks its own model.
     */
    readonly modelName?: string;
};

/**
 * Resolves the pricing of one model of one harness.
 *
 * It first tries exact match, then prefix match, then falls back to the pricing of a stable
 * default model, because every harness names new models faster than the pricing tables grow.
 */
export function resolveModelPricing(options: ResolveModelPricingOptions): ModelPricing {
    const { pricingTable, modelNameForEstimation, modelName } = options;
    const fallbackPricing = pricingTable[modelNameForEstimation];

    if (fallbackPricing === undefined) {
        throw new UnexpectedError(
            spaceTrim(`
                Missing pricing of the model \`${modelNameForEstimation}\` used for price estimation.

                **The model used for estimation must always be listed in its own pricing table.**
            `),
        );
    }

    if (!modelName) {
        return fallbackPricing;
    }

    const exactMatch = pricingTable[modelName];
    if (exactMatch) {
        return exactMatch;
    }

    const prefixMatch = Object.entries(pricingTable).find(([knownModelName]) =>
        modelName.startsWith(knownModelName),
    )?.[1];

    return prefixMatch ?? fallbackPricing;
}

// Note: [💞] Ignore a discrepancy between file name and entity name
