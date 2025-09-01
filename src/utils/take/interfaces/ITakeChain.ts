import type { Takeable } from './Takeable';

/**
 * Represents any value with take chain functionality
 * 
 * @private util of `@promptbook/color`
 * @deprecated [🤡] Use some better functional library instead of `TakeChain`
 */
export type WithTake<TValue extends Takeable> = TValue & ITakeChain<TValue>;

export interface ITakeChain<TValue extends Takeable> {
    readonly value: TValue;
    then<TResultValue extends Takeable>(callback: (value: TValue) => TResultValue): WithTake<TResultValue>;

    /*
    TODO:
    @alias for then which not support conversion of Take chain into the Promise chain
    pipe(): TValue & ITakeChain<TValue>;
    use():
    catch():
    */
}
