import { describe, expect, it } from '@jest/globals';
import spaceTrim from 'spacetrim';
import { isValidJsonString } from './isValidJsonString';

describe('how isValidJsonString works', () => {
    it('should tell that valid json is valid', () => {
        expect(isValidJsonString(`{"foo": "bar"}`)).toBe(true);
        expect(
            isValidJsonString(
                spaceTrim(`
                    {
                        "foo": "bar",
                        "bar": "baz",
                        "nested": {
                            "hello": "world"
                        }
                    }
                `),
            ),
        ).toBe(true);
    });

    it('should tell that non-json is not valid', () => {
        expect(
            isValidJsonString(
                spaceTrim(`
                  {
                      "foo": "bar
                  }
              `),
            ),
        ).toBe(false);
    });
});
