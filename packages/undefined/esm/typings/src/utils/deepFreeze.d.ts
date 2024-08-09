import type { ReadonlyDeep } from 'type-fest';
/**
 * @@@
 *
 * @returns The same object as the input, but deeply frozen
 *
 * Note: This function mutates the object and returns the original (but mutated-deep-freezed) object
 */
export declare function deepFreeze<TObject>(objectValue: TObject): ReadonlyDeep<TObject>;
/**
 * @@@
 * @@@
 *
 * @returns The same object as the input, but deeply frozen
 * @public exported from `@promptbook/utils`
 *
 * Note: This function mutates the object and returns the original (but mutated-deep-freezed) object
 */
export declare function deepFreezeWithSameType<TObject>(objectValue: TObject): TObject;
/**
 * TODO: [🧠] Is there a way how to meaningfully test this utility
 */
