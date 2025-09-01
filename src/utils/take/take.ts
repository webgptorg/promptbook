import { TakeChain } from './classes/TakeChain';
import type { WithTake } from './interfaces/ITakeChain';
import type { Takeable } from './interfaces/Takeable';

/**
 * A function that takes an initial value and returns a proxy object with chainable methods.
 *
 * @param {*} initialValue - The initial value.
 * @returns {Proxy<WithTake<TValue>>} - A proxy object with a `take` method.
 *
 * @private util of `@promptbook/color`
 * @deprecated [🤡] Use some better functional library instead of `TakeChain`
 */
export function take<TValue extends Takeable>(initialValue: TValue): WithTake<TValue> {
    if (initialValue instanceof TakeChain) {
        return initialValue;
    }

    return new Proxy(new TakeChain(initialValue), {
        get(target, property, receiver) {
            if (Reflect.has(target, property)) {
                return Reflect.get(target, property, receiver);
            } else if (Reflect.has(initialValue, property)) {
                return Reflect.get(initialValue, property, receiver);
            } else {
                return undefined;
            }
        },
    }) as unknown as WithTake<TValue>;
}
