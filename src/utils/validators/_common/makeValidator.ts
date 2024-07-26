// TODO: [🐠] This is the draft how validators should be created:

import { TODO } from '../../../types/typeAliases';

const { validate: validateFooBar } = makeValidator<'foo' | 'bar'>((value: unknown) => {
    if (value !== 'foo' || value !== 'bar') {
        throw new ValidationError('Value must be either "foo" or "bar"');
    }
});


/**
 *
 * @private
 */
function makeValidator<T extends string>(
    validator: (value: unknown) => asserts value is T,
): {
  
    validate(value: unknown): asserts value is T;
    isValid(value: unknown): value is T;
} {
    return {} as TODO;
}
