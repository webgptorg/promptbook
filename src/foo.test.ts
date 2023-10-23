import { foo } from './foo';

describe('the errored modules', () => {
    it(`should crash when there is a syntax-error in the module`, () => {
        expect(foo()).toBeTruthy();
    });
});

/**
 * TODO: !!! Remove this
 */
