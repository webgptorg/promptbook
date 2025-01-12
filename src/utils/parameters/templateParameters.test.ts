import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { just } from '../organization/just';
import { templateParameters } from './templateParameters';

describe('templateParameters', () => {
    it('should work in supersimple case', () => {
        expect(templateParameters('', {})).toBe('');
    });

    it('should keep template without parameters as it is', () => {
        expect(templateParameters('Hello', {})).toBe('Hello');
        expect(templateParameters('Hello World', {})).toBe('Hello World');
    });

    it('should replace parameter at the end', () => {
        expect(templateParameters('Hello {name}', { name: 'World' })).toBe('Hello World');
    });

    it('should replace parameter in the middle', () => {
        expect(templateParameters('Hello {name}, how are you?', { name: 'World' })).toBe('Hello World, how are you?');
    });

    it('should replace parameter at the beginning', () => {
        expect(templateParameters('{name}, how are you?', { name: 'World' })).toBe('World, how are you?');
    });

    it('should replace multiple parameters', () => {
        expect(templateParameters('{greeting} {name}, how are you?', { greeting: 'Hello', name: 'World' })).toBe(
            'Hello World, how are you?',
        );
    });

    it('should not be confused by JSON', () => {
        expect(
            templateParameters('{greeting} {name}, this is how JSON look like {"key": 1}.', {
                greeting: 'Hi',
                name: 'Pavol',
            }),
        ).toBe('Hi Pavol, this is how JSON look like {"key": 1}.');
        expect(
            templateParameters('{greeting} {name}, this is how JSON look like {}.', {
                greeting: 'Hi',
                name: 'Pavol',
            }),
        ).toBe('Hi Pavol, this is how JSON look like {}.');
        expect(
            templateParameters(
                '{greeting} {name}, this is how JSON look like {"greeting": "{greeting}", "name": "{name}"}.',
                {
                    greeting: 'Hi',
                    name: 'Pavol',
                },
            ),
        ).toBe('Hi Pavol, this is how JSON look like {"greeting": "Hi", "name": "Pavol"}.');
        expect(
            templateParameters(
                '{greeting} {name}, this is how JSON look like {"params": {"greeting": "{greeting}", "name": "{name}"}}.',
                {
                    greeting: 'Hi',
                    name: 'Pavol',
                },
            ),
        ).toBe('Hi Pavol, this is how JSON look like {"params": {"greeting": "Hi", "name": "Pavol"}}.');
        expect(
            templateParameters(
                '{greeting} {name}, this is how invalid JSON look like {"params": {"greeting": "{greeting}", "name": "{name}"}.',
                {
                    greeting: 'Hi',
                    name: 'Pavol',
                },
            ),
        ).toBe('Hi Pavol, this is how invalid JSON look like {"params": {"greeting": "Hi", "name": "Pavol"}.');
    });

    it('should replace same parameter multiple times', () => {
        expect(
            templateParameters('{greeting} {name}, how are you? {greeting} {name}', {
                greeting: 'Hello',
                name: 'World',
            }),
        ).toBe('Hello World, how are you? Hello World');
    });

    it('should replace multi-line tasks', () => {
        expect(
            templateParameters(
                spaceTrim(`
                    Hello {name}, how are you?
                    I am {greeting}
                `),
                { greeting: 'fine', name: 'World' },
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Hello World, how are you?
                    I am fine
                `),
            ),
        );
    });

    it('should not be confused by some NON-JSON structure containing chars {}', () => {
        expect(templateParameters('{greeting {name}}, how are you?', { greeting: 'Hello', name: 'world' })).toBe(
            '{greeting world}, how are you?',
        );
        expect(templateParameters('<greeting {name}>', { greeting: 'Hello', name: 'world' })).toBe('<greeting world>');

        expect(templateParameters('<{greeting {name}}>', { greeting: 'Hello', name: 'world' })).toBe(
            '<{greeting world}>',
        );
        expect(templateParameters('<{{{greeting {name}}}}>', { greeting: 'Hello', name: 'world' })).toBe(
            '<{{{greeting world}}}>',
        );

        expect(templateParameters('{greeting} }{}{}{', { greeting: 'Hello', name: 'world' })).toBe('Hello }{}{}{');
    });

    it('should throw error when parameter is not defined', () => {
        expect(() => templateParameters('{greeting} {name}, how are you?', { greeting: 'Hello' })).toThrowError(
            /Parameter `{name}` is not defined/i,
        );
    });

    it('should throw error when parameter is not closed', () => {
        expect(() => templateParameters('Hello {name', { name: 'world' })).toThrowError(/Parameter is not closed/i);
    });

    it('should throw error when parameter is not opened', () => {
        expect(() =>
            templateParameters('greeting} {name}, how are you?', { greeting: 'Hello', name: 'World' }),
        ).toThrowError(/Parameter is not opened/i);
    });

    it('should preserve indentation in multi-line tasks', () => {
        expect(
            templateParameters(
                spaceTrim(`
                    Hello {name}, how are you?

                    {response}
                `),
                {
                    name: 'Pavol',
                    response: spaceTrim(`
                        I am fine.
                        And you?

                        But I need some bananas 🍌
                    `),
                },
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Hello Pavol, how are you?

                    I am fine.
                    And you?

                    But I need some bananas 🍌
                `),
            ),
        );
    });

    it('should preserve multiple indentations in multi-line tasks', () => {
        expect(
            templateParameters(
                spaceTrim(`
                  Hello {name}, how are you?

                      {response}
              `),
                {
                    name: 'Pavol',
                    response: spaceTrim(`
                        I am fine.
                        And you?

                            But I need some bananas 🍌
                    `),
                },
            ),
        ).toBe(
            just(
                spaceTrim(`
                  Hello Pavol, how are you?

                      I am fine.
                      And you?
                      ${`` /* <- Preserve indentation */}
                          But I need some bananas 🍌
              `),
            ),
        );
    });

    it('should preserve col-chars in multi-line tasks', () => {
        expect(
            templateParameters(
                spaceTrim(`
                    Hello {name}, how are you?

                    > {response}
                `),
                {
                    name: 'Pavol',
                    response: spaceTrim(`
                        I am fine.
                        And you?

                        But I need some bananas 🍌
                    `),
                },
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Hello Pavol, how are you?

                    > I am fine.
                    > And you?
                    > ${`` /* <- Preserve space */}
                    > But I need some bananas 🍌
                `),
            ),
        );
        expect(
            templateParameters(
                spaceTrim(`
                    Hello {name}, how are you?

                    $ {response}
                `),
                {
                    name: 'Pavol',
                    response: spaceTrim(`
                        I am fine.
                        And you?

                        But I need some bananas 🍌
                    `),
                },
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Hello Pavol, how are you?

                    $ I am fine.
                    $ And you?
                    $ ${`` /* <- Preserve space */}
                    $ But I need some bananas 🍌
                `),
            ),
        );
    });

    it('should not-preserve non-col-chars in multi-line tasks', () => {
        expect(
            templateParameters(
                spaceTrim(`
                  Hello {name}, how are you?

                  The response from {name} is: {response}
              `),
                {
                    name: 'Pavol',
                    response: spaceTrim(`
                      I am fine.
                      And you?
                      ${`` /* <- Preserve indentation */}
                      But I need some bananas 🍌
                  `),
                },
            ),
        ).toBe(
            just(
                spaceTrim(`
                  Hello Pavol, how are you?

                  The response from Pavol is: I am fine.
                  And you?
                  ${`` /* <- Preserve indentation */}
                  But I need some bananas 🍌
              `),
            ),
        );
    });

    it('should work with combination of col-chars and non-col-chars in multi-line tasks', () => {
        expect(
            templateParameters(
                spaceTrim(`
                    Hello {name}, how are you?

                    > {response}

                    | {response}

                    Pavol said "{response}" and "{response}"
                `),
                {
                    name: 'Pavol',
                    response: spaceTrim(`
                        I am fine.
                        And you?

                        But I need some bananas 🍌
                    `),
                },
            ),
        ).toBe(
            just(
                spaceTrim(`
                    Hello Pavol, how are you?

                    > I am fine.
                    > And you?
                    > ${`` /* <- Preserve space */}
                    > But I need some bananas 🍌

                    | I am fine.
                    | And you?
                    | ${`` /* <- Preserve space */}
                    | But I need some bananas 🍌

                    Pavol said "I am fine.
                    And you?
                    ${`` /* <- Preserve indentation */}
                    But I need some bananas 🍌" and "I am fine.
                    And you?
                    ${`` /* <- Preserve indentation */}
                    But I need some bananas 🍌"
                `),
            ),
        );
    });

    it('should work with escaping', () => {
        expect(
            templateParameters('\\{name\\}, how are you?', {
                name: 'Paul',
            }),
        ).toBe('\\{name\\}, how are you?');
    });

    it('should prevent prompt-injection', () => {
        expect(
            templateParameters('{name}, how are you?', {
                name: '{instructions} + {context}',
                instructions: 'Some secret information',
            }),
        ).toBe('\\{instructions\\} + \\{context\\}, how are you?');
    });
});
