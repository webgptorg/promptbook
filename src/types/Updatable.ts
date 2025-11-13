import { BehaviorSubject } from 'rxjs';

/**
 * A type that represents a value that can be updated over time:
 *
 * 1) It can be a static value of type `TValue`
 * 2) Or a `BehaviorSubject` that emits values of type `TValue`
 * 3) Or pair of `[getValue, setValue]` functions for getting and setting the value
 *
 * @public exported from `@promptbook/types`
 */
export type Updatable<TValue> = TValue | BehaviorSubject<TValue> | [TValue, (value: TValue) => void];

/**
 * Restricts an Updatable to a (2) BehaviorSubject variant
 *
 * @see Updatable
 * @private internal utility <- TODO: [🧠] Maybe export from `@promptbook/types`
 */
export function asUpdatableSubject<TValue>(value: Updatable<TValue>): BehaviorSubject<TValue> {
    if (value instanceof BehaviorSubject) {
        return value;
    } else if (Array.isArray(value)) {
        if (value.length !== 2) {
            throw new TypeError('`asUpdatableSubject`: Invalid tuple length, expected 2 elements');
        }

        if (typeof value[1] !== 'function') {
            throw new TypeError('`asUpdatableSubject`: Invalid tuple, expected second element to be a function');
        }

        const [theValue, setValue] = value;
        const subject = new BehaviorSubject<TValue>(theValue);
        subject.subscribe((newValue) => {
            setValue(newValue);
        });
        return subject;
    } else {
        return new BehaviorSubject(value);
    }
}

/**
 * TODO: [🧠] Maybe `BehaviorSubject` is too heavy for this use case, maybe just tuple `[value,setValue]` is enough
 */
