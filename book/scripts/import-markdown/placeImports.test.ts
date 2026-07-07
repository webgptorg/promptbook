import { describe, expect, it } from '@jest/globals';
import { spaceTrim } from 'spacetrim';
import { GENERATOR_WARNING } from '../config';
import { placeImports } from './placeImports';
// import { placeImports } from './placeImports';

describe('how replacing imports works', () => {
    it('should keep markdown without imports', () =>
        expect(
            placeImports(
                spaceTrim(`
                    # Heading

                    Foo bar baz
                `),
                async (importPath: string) => '',
            ),
        ).resolves.toBe(
            spaceTrim(`
                    # Heading

                    Foo bar baz
            `),
        ));

    it('should place imports', () =>
        expect(
            placeImports(
                spaceTrim(`
                    # Heading

                    Foo bar baz


                    <!--Import ./sub.md-->
                    <!--/Import ./sub.md-->

                `),
                async (importPath: string) => ({ './sub.md': 'Imported content' }[importPath] || ''),
            ),
        ).resolves.toBe(
            spaceTrim(`
                    # Heading

                    Foo bar baz


                    <!--Import ./sub.md-->
                    <!--${GENERATOR_WARNING}-->

                    Imported content

                    <!--/Import ./sub.md-->
            `),
        ));

    it('should replace imports', () =>
        expect(
            placeImports(
                spaceTrim(`
                    # Heading

                    Foo bar baz


                    <!--Import ./sub.md-->
                    <!--${GENERATOR_WARNING}-->

                    Old content

                    <!--/Import ./sub.md-->

                `),
                async (importPath: string) => ({ './sub.md': 'New content' }[importPath] || ''),
            ),
        ).resolves.toBe(
            spaceTrim(`
                    # Heading

                    Foo bar baz


                    <!--Import ./sub.md-->
                    <!--${GENERATOR_WARNING}-->

                    New content

                    <!--/Import ./sub.md-->
              `),
        ));

    it('should place multiple levels of imports', () =>
        expect(
            placeImports(
                spaceTrim(`

                    First level

                    <!--Import ./second.md-->
                    <!--/Import ./second.md-->


                `),
                async (importPath: string) =>
                    ({
                        './second.md': spaceTrim(`

                    Second level

                    <!--Import ./third.md-->

                    Old third level content

                    <!--/Import ./third.md-->


                    `),
                        './third.md': spaceTrim(`

                    Third level
                    with multiple lines

                    <!--
                    And comments that should be removed
                    -->


                      `),
                    }[importPath] || ''),
            ),
        ).resolves.toBe(
            spaceTrim(`
                    First level

                    <!--Import ./second.md-->
                    <!--${GENERATOR_WARNING}-->

                    Second level




                    Third level
                    with multiple lines

                    <!--/Import ./second.md-->
            `),
        ));
});
