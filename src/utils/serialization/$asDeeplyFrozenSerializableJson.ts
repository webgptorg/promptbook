import { UnexpectedError } from '../../errors/UnexpectedError';
import { $deepFreeze } from './deepFreeze';
import { isSerializableAsJson } from './isSerialisableAsJson';

/**
 * @@@
 * @@@
 *
 * Note: This function mutates the object and returns the original (but mutated-deep-freezed) object
 *
 * @returns The same object as the input, but deeply frozen
 * @private this is in comparison to `deepFreeze` a more specific utility and maybe not very good practice to use without specific reason and considerations
 */
export function $asDeeplyFrozenSerializableJson<TObject>(objectValue: TObject): TObject {
    if (!isSerializableAsJson(objectValue)) {
        throw new UnexpectedError(`Object is not serializable as JSON`);
        //          <- TODO: [🧠] Better locate where this happen
    }

    return $deepFreeze(objectValue) as TObject;
}

/**
 * TODO: [🧠] Is there a way how to meaningfully test this utility
 */
