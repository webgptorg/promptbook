import type { Takeable } from './Takeable';

/**
 * Represents any value with take chain functionality
 *
 * @deprecated [🤡] Use some better functional library instead of `TakeChain`
 *
 * @private util of `@promptbook/color`
 */
export type WithTake<TValue extends Takeable> = TValue & ITakeChain<TValue>;

/**
 * Type describing take chain.
 */
export type ITakeChain<TValue extends Takeable> = {
    readonly value: TValue;
    then<TResultValue extends Takeable>(callback: (value: TValue) => TResultValue): WithTake<TResultValue>;

    /*
    TODO:
    @alias for then which not support conversion of Take chain into the Promise chain
    pipe(): TValue & ITakeChain<TValue>;
    use():
    catch():
    */
};
