Utility functions used in the library but also useful for individual use in preprocessing and postprocessing LLM inputs and outputs

Here is a overview of the functions which are exported from the `@promptbook/utils` package and can be used in your own projects:

## Postprocessing

Sometimes you need to postprocess the output of the LLM model, every postprocessing function that is available through `POSTPROCESS` command in promptbook is exported from `@promptbook/utils`. You can use:

-   `spaceTrim`
-   `extractAllBlocksFromMarkdown`, _<- Note: Exported from `@promptbook/markdown-utils`_
-   `extractAllListItemsFromMarkdown` _<- Note: Exported from `@promptbook/markdown-utils`_
-   `extractBlock`
-   `extractOneBlockFromMarkdown `_<- Note: Exported from `@promptbook/markdown-utils`_
-   `prettifyPipelineString`
-   `removeContentComments`
-   `removeEmojis`
-   `removeMarkdownFormatting` _<- Note: Exported from `@promptbook/markdown-utils`_
-   `removeQuotes`
-   `trimCodeBlock`
-   `trimEndOfCodeBlock`
-   `unwrapResult`

Very often you will use `unwrapResult`, which is used to extract the result you need from output with some additional information:

```typescript
import { unwrapResult } from '@promptbook/utils';

unwrapResult('Best greeting for the user is "Hi Pavol!"'); // 'Hi Pavol!'
```

## Templating

There is a function `replaceParameters` which is used to replace the parameters in given template optimized to LLM prompt templates.

```typescript
import { replaceParameters } from '@promptbook/utils';

replaceParameters('Hello, {name}!', { name: 'world' }); // 'Hello, world!'
```

And also multiline templates with blockquotes

```typescript
import { replaceParameters, spaceTrim } from '@promptbook/utils';

replaceParameters(
    spaceTrim(`
        Hello, {name}!

        > {answer}
    `),
    {
        name: 'world',
        answer: spaceTrim(`
            I'm fine,
            thank you!

            And you?
        `),
    },
);

// Hello, world!
//
// > I'm fine,
// > thank you!
// >
// > And you?
```

## Counting

Theese functions are usefull to count stats about the input/output in human-like terms not tokens and bytes, you can use
`countCharacters`, `countLines`, `countPages`, `countParagraphs`, `countSentences`, `countWords`

```typescript
import { countWords } from '@promptbook/utils';

console.log(countWords('Hello, world!')); // 2
```

## Splitting

Splitting functions are similar to counting but they return the splitted parts of the input/output, you can use
`splitIntoCharacters`, `splitIntoLines`, `splitIntoPages`, `splitIntoParagraphs`, `splitIntoSentences`, `splitIntoWords`

```typescript
import { splitIntoWords } from '@promptbook/utils';

console.log(splitIntoWords('Hello, world!')); // ['Hello', 'world']
```

## Normalization

Normalization functions are used to put the string into a normalized form, you can use
`kebab-case`
`PascalCase`
`SCREAMING_CASE`
`snake_case`
`kebab-case`

```typescript
import { normalizeTo } from '@promptbook/utils';

console.log(normalizeTo['kebab-case']('Hello, world!')); // 'hello-world'
```

-   There are more normalization functions like `capitalize`, `decapitalize`, `removeDiacritics`,...
-   Theese can be also used as postprocessing functions in the `POSTPROCESS` command in promptbook

## Misc

See also the documentation for all the functions in the `@promptbook/utils` package, every function is documented by jsdoc, typed by typescript and tested by jest.

<!-- TODO: Describe -->

`assertsExecutionSuccessful`,
`checkExpectations`,
`executionReportJsonToString`,
`isPassingExpectations`,
`isValidJsonString`,
`parseNumber` <!-- <- [🌻] -->
