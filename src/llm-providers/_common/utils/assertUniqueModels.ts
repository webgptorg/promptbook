import { AvailableModel } from '../../../execution/AvailableModel';

/**
 * Utility to assert that all models in the provided array have unique `modelName` values.
 *
 * This is internal utility for unit tests to ensure no duplicate model names exist.
 */
export function assertUniqueModels(models: ReadonlyArray<AvailableModel>) {
    const seen = new Map<string, boolean>();
    const duplicates: string[] = [];
    for (const model of models) {
        const value = model.modelName;
        if (typeof value !== 'string') continue;
        if (seen.has(value)) {
            duplicates.push(value);
        } else {
            seen.set(value, true);
        }
    }
    if (duplicates.length > 0) {
        throw new Error(`Duplicate model names found: ${duplicates.join(', ')}`);
    }
}
