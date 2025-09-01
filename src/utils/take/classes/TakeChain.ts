import type { ITakeChain } from '../interfaces/ITakeChain';
import type { Takeable } from '../interfaces/Takeable';
import { take } from '../take';


/**
 * @private util of `@promptbook/color`
 * @de
 */
export class TakeChain<TValue extends Takeable> implements ITakeChain<TValue> {
    public constructor(public value: TValue) {}

    public then<TResultValue extends Takeable>(
        callback: (oldValue: TValue) => TResultValue,
    ): TResultValue & ITakeChain<TResultValue> {
        const newValue = callback(this.value);
        return take(newValue);
    }
}
