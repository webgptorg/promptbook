import { stringifyPipelineJson } from '../../conversion/utils/stringifyPipelineJson';
import { UnexpectedError } from '../../errors/UnexpectedError';
import { isSerializableAsJson } from '../../utils/serialization/isSerializableAsJson';
import type { PromptbookStorage } from '../_common/PromptbookStorage';

/**
 * @@@
 *
 * @private for `getLocalStorage` and `getSessionStorage`
 */
export function makePromptbookStorageFromWebStorage<TValue>(webStorage: Storage): PromptbookStorage<TValue> {
    return {
        getItem(key: string): TValue | null {
            const stringValue = webStorage.getItem(key);

            if (stringValue === null) {
                return null;
            }

            const value = JSON.parse(stringValue) as TValue;

            // TODO: [🌗]

            return value;
        },

        setItem(key: string, value: TValue): void {
            if (!isSerializableAsJson(value)) {
                throw new UnexpectedError(`The "${key}" you want to store in web storage is not serializable as JSON`);
            }

            const stringValue = stringifyPipelineJson(value);
            webStorage.setItem(key, stringValue);
        },

        removeItem(key: string): void {
            webStorage.removeItem(key);
        },
    };
}

/**
 * TODO: [🧠] Should this be named `makePromptbookStorageFromWebStorage` vs `createPromptbookStorageFromWebStorage`
 * TODO: [🌗] Maybe some checkers, not all valid JSONs are desired and valid values
 */
