Comprehensive utility functions for text processing, validation, normalization, and LLM input/output handling in the Promptbook ecosystem.

## 🎯 Purpose and Motivation

The utils package provides a rich collection of utility functions that are essential for working with LLM inputs and outputs. It handles common tasks like text normalization, parameter templating, validation, and postprocessing, eliminating the need to implement these utilities from scratch in every promptbook application.

## 🔧 High-Level Functionality

This package offers utilities across multiple domains:

-   **Text Processing**: Counting, splitting, and analyzing text content
-   **Template System**: Secure parameter substitution and prompt formatting
-   **Normalization**: Converting text to various naming conventions and formats
-   **Validation**: Comprehensive validation for URLs, emails, file paths, and more
-   **Serialization**: JSON handling, deep cloning, and object manipulation
-   **Environment Detection**: Runtime environment identification utilities
-   **Format Parsing**: Support for CSV, JSON, XML validation and parsing

## ✨ Key Features

-   🔒 **Secure Templating** - Prompt injection protection with template functions
-   📊 **Text Analysis** - Count words, sentences, paragraphs, pages, and characters
-   🔄 **Case Conversion** - Support for kebab-case, camelCase, PascalCase, SCREAMING_CASE
-   ✅ **Comprehensive Validation** - Email, URL, file path, UUID, and format validators
-   🧹 **Text Cleaning** - Remove emojis, quotes, diacritics, and normalize whitespace
-   📦 **Serialization Tools** - Deep cloning, JSON export, and serialization checking
-   🌐 **Environment Aware** - Detect browser, Node.js, Jest, and Web Worker environments
-   🎯 **LLM Optimized** - Functions specifically designed for LLM input/output processing

## Simple templating

The `prompt` template tag function helps format prompt strings for LLM interactions. It handles string interpolation and maintains consistent formatting for multiline strings and lists and also handles a security to avoid **prompt injection**.

```typescript
import { prompt } from '@promptbook/utils';

const promptString = prompt`
    Correct the following sentence:

    > ${unsecureUserInput}
`;
```

The `prompt` name could be overloaded by multiple things in your code. If you want to use the `promptTemplate` which is alias for `prompt`:

```typescript
import { promptTemplate } from '@promptbook/utils';

const promptString = promptTemplate`
    Correct the following sentence:

    > ${unsecureUserInput}
`;
```

## Advanced templating

There is a function `templateParameters` which is used to replace the parameters in given template optimized to LLM prompt templates.

```typescript
import { templateParameters } from '@promptbook/utils';

templateParameters('Hello, {name}!', { name: 'world' }); // 'Hello, world!'
```

And also multiline templates with blockquotes

```typescript
import { templateParameters, spaceTrim } from '@promptbook/utils';

templateParameters(
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

These functions are useful to count stats about the input/output in human-like terms not tokens and bytes, you can use
`countCharacters`, `countLines`, `countPages`, `countParagraphs`, `countSentences`, `countWords`

```typescript
import { countWords } from '@promptbook/utils';

console.log(countWords('Hello, world!')); // 2
```

## Splitting

Splitting functions are similar to counting but they return the split parts of the input/output, you can use
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
-   These can be also used as postprocessing functions in the `POSTPROCESS` command in promptbook

## Postprocessing

Sometimes you need to postprocess the output of the LLM model, every postprocessing function that is available through `POSTPROCESS` command in promptbook is exported from `@promptbook/utils`. You can use:

-   `spaceTrim`
-   `extractAllBlocksFromMarkdown`, _<- Note: Exported from [`@promptbook/markdown-utils`](https://www.npmjs.com/package/@promptbook/markdown-utils)_
-   `extractAllListItemsFromMarkdown` _<- Note: Exported from [`@promptbook/markdown-utils`](https://www.npmjs.com/package/@promptbook/markdown-utils)_
-   `extractBlock`
-   `extractOneBlockFromMarkdown `_<- Note: Exported from [`@promptbook/markdown-utils`](https://www.npmjs.com/package/@promptbook/markdown-utils)_
-   `prettifyPipelineString`
-   `removeMarkdownComments`
-   `removeEmojis`
-   `removeMarkdownFormatting` _<- Note: Exported from [`@promptbook/markdown-utils`](https://www.npmjs.com/package/@promptbook/markdown-utils)_
-   `removeQuotes`
-   `trimCodeBlock`
-   `trimEndOfCodeBlock`
-   `unwrapResult`

Very often you will use `unwrapResult`, which is used to extract the result you need from output with some additional information:

```typescript
import { unwrapResult } from '@promptbook/utils';

unwrapResult('Best greeting for the user is "Hi Pavol!"'); // 'Hi Pavol!'
```

## 📦 Exported Entities

### Version Information

-   `BOOK_LANGUAGE_VERSION` - Current book language version
-   `PROMPTBOOK_ENGINE_VERSION` - Current engine version

### Configuration Constants

-   `VALUE_STRINGS` - Standard value strings
-   `SMALL_NUMBER` - Small number constant

### Visualization

-   `renderPromptbookMermaid` - Render promptbook as Mermaid diagram

### Error Handling

-   `deserializeError` - Deserialize error objects
-   `serializeError` - Serialize error objects

### Async Utilities

-   `forEachAsync` - Async forEach implementation

### Format Validation

-   `isValidCsvString` - Validate CSV string format
-   `isValidJsonString` - Validate JSON string format
-   `jsonParse` - Safe JSON parsing
-   `isValidXmlString` - Validate XML string format

### Template Functions

-   `prompt` - Template tag for secure prompt formatting
-   `promptTemplate` - Alias for prompt template tag

### Environment Detection

-   `$getCurrentDate` - Get current date (side effect)
-   `$isRunningInBrowser` - Check if running in browser
-   `$isRunningInJest` - Check if running in Jest
-   `$isRunningInNode` - Check if running in Node.js
-   `$isRunningInWebWorker` - Check if running in Web Worker

### Text Counting and Analysis

-   `CHARACTERS_PER_STANDARD_LINE` - Characters per standard line constant
-   `LINES_PER_STANDARD_PAGE` - Lines per standard page constant
-   `countCharacters` - Count characters in text
-   `countLines` - Count lines in text
-   `countPages` - Count pages in text
-   `countParagraphs` - Count paragraphs in text
-   `splitIntoSentences` - Split text into sentences
-   `countSentences` - Count sentences in text
-   `countWords` - Count words in text
-   `CountUtils` - Utility object with all counting functions

### Text Normalization

-   `capitalize` - Capitalize first letter
-   `decapitalize` - Decapitalize first letter
-   `DIACRITIC_VARIANTS_LETTERS` - Diacritic variants mapping
-   `string_keyword` - Keyword string type (type)
-   `Keywords` - Keywords type (type)
-   `isValidKeyword` - Validate keyword format
-   `nameToUriPart` - Convert name to URI part
-   `nameToUriParts` - Convert name to URI parts
-   `string_kebab_case` - Kebab case string type (type)
-   `normalizeToKebabCase` - Convert to kebab-case
-   `string_camelCase` - Camel case string type (type)
-   `normalizeTo_camelCase` - Convert to camelCase
-   `string_PascalCase` - Pascal case string type (type)
-   `normalizeTo_PascalCase` - Convert to PascalCase
-   `string_SCREAMING_CASE` - Screaming case string type (type)
-   `normalizeTo_SCREAMING_CASE` - Convert to SCREAMING_CASE
-   `normalizeTo_snake_case` - Convert to snake_case
-   `normalizeWhitespaces` - Normalize whitespace characters
-   `orderJson` - Order JSON object properties
-   `parseKeywords` - Parse keywords from input
-   `parseKeywordsFromString` - Parse keywords from string
-   `removeDiacritics` - Remove diacritic marks
-   `searchKeywords` - Search within keywords
-   `suffixUrl` - Add suffix to URL
-   `titleToName` - Convert title to name format

### Text Organization

-   `spaceTrim` - Trim spaces while preserving structure

### Parameter Processing

-   `extractParameterNames` - Extract parameter names from template
-   `numberToString` - Convert number to string
-   `templateParameters` - Replace template parameters
-   `valueToString` - Convert value to string

### Parsing Utilities

-   `parseNumber` - Parse number from string

### Text Processing

-   `removeEmojis` - Remove emoji characters
-   `removeQuotes` - Remove quote characters

### Serialization

-   `$deepFreeze` - Deep freeze object (side effect)
-   `checkSerializableAsJson` - Check if serializable as JSON
-   `clonePipeline` - Clone pipeline object
-   `deepClone` - Deep clone object
-   `exportJson` - Export object as JSON
-   `isSerializableAsJson` - Check if object is JSON serializable
-   `jsonStringsToJsons` - Convert JSON strings to objects

### Set Operations

-   `difference` - Set difference operation
-   `intersection` - Set intersection operation
-   `union` - Set union operation

### Code Processing

-   `trimCodeBlock` - Trim code block formatting
-   `trimEndOfCodeBlock` - Trim end of code block
-   `unwrapResult` - Extract result from wrapped output

### Validation

-   `isValidEmail` - Validate email address format
-   `isRootPath` - Check if path is root path
-   `isValidFilePath` - Validate file path format
-   `isValidJavascriptName` - Validate JavaScript identifier
-   `isValidPromptbookVersion` - Validate promptbook version
-   `isValidSemanticVersion` - Validate semantic version
-   `isHostnameOnPrivateNetwork` - Check if hostname is on private network
-   `isUrlOnPrivateNetwork` - Check if URL is on private network
-   `isValidPipelineUrl` - Validate pipeline URL format
-   `isValidUrl` - Validate URL format
-   `isValidUuid` - Validate UUID format

> 💡 This package provides utility functions for promptbook applications. For the core functionality, see [@promptbook/core](#-packages) or install all packages with `npm i ptbk`
