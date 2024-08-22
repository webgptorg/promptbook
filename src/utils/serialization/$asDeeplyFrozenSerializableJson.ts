import type { string_name } from '../../types/typeAliases';
import { $deepFreeze } from './$deepFreeze';
import { checkSerializableAsJson } from './checkSerializableAsJson';

/**
 * @@@
 * @@@
 *
 * Note: This function mutates the object and returns the original (but mutated-deep-freezed) object
 *
 * @param name - Name of the object for debugging purposes
 * @param objectValue - Object to be deeply frozen
 * @returns The same object as the input, but deeply frozen
 * @private this is in comparison to `deepFreeze` a more specific utility and maybe not very good practice to use without specific reason and considerations
 */
export function $asDeeplyFrozenSerializableJson<TObject>(name: string_name, objectValue: TObject): TObject {
    checkSerializableAsJson(name, objectValue);
    return $deepFreeze(objectValue) as TObject;
}

/**
 * TODO: [🧠][🛣] More elegant way to tracking than passing `name`
 * TODO: [🧠] Is there a way how to meaningfully test this utility
 */
