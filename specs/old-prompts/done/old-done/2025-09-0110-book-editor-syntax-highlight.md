[x]

[✨🐬] Syntax highlighting in `<BookEditor/>` should highlight more commitments:

-   Add commitment `GOAL` The main goal which should be achieved by the AI assistant. There can be multiple goals. Later goals are more important than earlier goals.
-   Add commitment `MEMORY` Similar to `KNOWLEDGE` but has a focus on remembering past interactions and user preferences.
-   Add commitment `MESSAGE` 1:1 text of the message which AI assistant already sent during the conversation. Later messages are later in the conversation. It is bit similar to `EXAMPLE` but it is not example, it is the real message which AI assistant already sent.
-   Add commitment `SCENARIO` A specific situation or context in which the AI assistant should operate. It helps to set the scene for the AI's responses. Later scenarios are more important than earlier scenarios.
-   Add commitment `DELETE` (`CANCEL`, `DISCARD`, `REMOVE`) A commitment (and aliases) to remove or disregard certain information or context.

-   For all these commitments, create standard commitment definition
-   Cross-reference these commitments in the documentation when relevant
-   Look at existing commitment definitions for the reference
-   Keep in mind DRY principle, do not repeat yourself.

---

[x]

[✨🐬] Syntax highlighting in `<BookEditor/>` of commitment `META IMAGE` should work differently:

-   Change all meta commitments definition `MetaImageCommitmentDefinition`, `MetaLinkCommitmentDefinition`,... into single commitment definition `MetaCommitmentDefinition`
-   It should highlight `META IMAGE`, `META LINK`, `META TITLE`, `META DESCRIPTION` as single word commitment
-   It should highlight everything `META UPPERCASE FOO` as single word commitment
-   Look at existing commitment definitions for the reference
-   Keep in mind DRY principle, do not repeat yourself.

---

[.] <- Note: Done without the Prompt

[✨🐬] Fix parsing of `META IMAGE` commitment

-   Keep the versatility of the `META ______` commitment to accept any meta type, but ensure that `META IMAGE` specifically parses correctly.

```typescript
it('parses agent with persona and profile image', () => {
    const agentSource = validateBook(
        spaceTrim(`
            Agent Name
            PERSONA A helpful assistant
            META IMAGE https://img.url/pic.png
        `),
    );
    const result = parseAgentSource(agentSource);
    expect(result).toEqual({
        agentName: 'Agent Name',
        personaDescription: 'A helpful assistant',
        profileImageUrl: 'https://img.url/pic.png',
    });
});
```

---

[x]

[✨🐬] All commitment definitions should work out of the box in both singular and plural

-   For example `MESSAGE` and `MESSAGES` should both work and be highlighted same with `EXAMPLE` and `EXAMPLES`, etc.
-   Keep in mind that some plurals are not just adding `s` at the end, for example `PERSONA` and `PERSONAE`.
-   There **should not exist** some separate place where plural forms are defined - each commitment definition should work as plugin
-   Look at existing commitment definitions for the reference
-   Reflect this change into the `/CHANGELOG.md`
-   Keep in mind DRY principle, do not repeat yourself.

Do it via existing system of passing the alias into the constructor:

```typescript
new RuleCommitmentDefinition('RULE'),
new RuleCommitmentDefinition('RULES'),
```

---

[x]

[✨🐬] Syntax highlighting in `<BookEditor/>` should work with parameters

-   Parameter is another syntax feature in book language and it should be highlighted too but in different color.
-   There are two types of parameters:
-   ` @Parameter`, ` @ěščřžý` - single word parameter starting with `@`
-   `{parameterName}` or `{parameter with multiple words}` or `{parameterName: description text}`

Here is the example:

```book
AI Assistant

KNOWLEDGE about {topic}
EXAMPLE of @Something
```

-   You are now implementing syntax highlighting not entire parsing logic, implement everything needed for highlighting and keep room with comments for future parsing logic when needed.
-   But reflect this principle into the `/CHANGELOG.md` with note that its in progress and not fully implemented yet.
-   Look at existing highlighting of the first word of the book and highlighting of commitments for the reference
-   Keep in mind DRY principle, do not repeat yourself.

---

[x]

[✨🐬] Enhance syntax highlighting and parsing in `<BookEditor/>` and `parseAgentSource` for the parameters - keep one syntax with two notations

-   Now there are two notations for parameters:
    -   ` @Parameter`, ` @ěščřžý` - single word parameter starting with `@`
    -   `{parameterName}` or `{parameter with multiple words}` or `{parameterName: description text}`
-   Now, these are highlighted differently one in orange color and the other in purple color, but should be
-   Now, they are also treated and parsed differently, but should be
-   But these are two different notations for the **same syntax feature** of the Book language - the parameter.
-   Change the syntax highlighting so both these syntaxes are highlighted in the same color - the purple color.
-   And also reflect this change into the parsing logic - both these syntaxes should be parsed as the same syntax feature - the parameter.
-   The function `parseAgentSource` should has parameters array in the result, all the parameters occured in the parsed source
-   Just that this syntax feature has two different notations.
-   This principle should - two different notations for the same syntax feature - should be clear in the `/CHANGELOG.md`, code comments, parsing logic, etc.
-   Keep in mind DRY principle, do not repeat yourself

---

[x]

[✨🐬] Syntax highlighting in `<BookEditor/>` of commitment `META IMAGE` has some false positive highlights

-   It should highlight `META IMAGE`, `META LINK`, `META TITLE`, `META DESCRIPTION` as single word commitment
-   It should highlight everything `META FOO` as single word commitment
-   But not the 3rd word, for example `META IMAGE something` should highlight only `META IMAGE` as commitment and `something` should not be highlighted as commitment.
-   Keep in mind DRY principle, do not repeat yourself.

---

[x]

[✨🐬] Parsing of metadata commitments

-   Function `parseAgentSource` should parse all metadata commitments like `META IMAGE`, `META LINK`, `META TITLE`, `META DESCRIPTION`, `META XXX` and return them in the result.
-   Now it parses just `profileImageUrl` but it is hardcoded just for `META IMAGE`
-   Remove from the result of `parseAgentSource` the `profileImageUrl` and change it to `meta.image`
-   `meta.image` is not much special compared to other meta parameters
-   Only special thing about `meta.image` is that it always have default fallback created by `generatePlaceholderAgentProfileImageUrl`
-   It should parse all metadata commitments and return them in the result in a structured way, for example as object `meta: { image?: string; link?: string; title?: string; description?: string; [key: string]: string | undefined }`
-   `META` commitment has always two words, the first word is always `META` and the second word is the type of the meta, like `IMAGE`, `LINK`, `TITLE`, `DESCRIPTION`, etc. The rest of the line or multiple lines (until the next commitment or end of the book) is the value of the meta.
-   When there are multiple meta commitments of same type, later should override the earlier
-   Look at existing parsing of `profileImageUrl` for the reference _(but change it to be generic for all metadata commitments, not just for `META IMAGE`)_
-   `personaDescription` is NOT metadata commitment, it is separate commitment, keep it as is.
-   Modify tests of `parseAgentSource`
-   Keep in mind DRY principle, do not repeat yourself.

1. For example the source:

```book
AI Avatar

PERSONA A friendly AI assistant that helps you with your tasks
META FOO foo
```

1. Should be parsed by `parseAgentSource` to:

```json
{
    "agentName": "AI Avatar",
    "personaDescription": "A friendly AI assistant that helps you with your tasks",
    "meta": {
        "image": "https://www.gravatar.com/avatar/xxx?default=robohash&size=200&rating=x",
        "foo": "foo"
    },
    "parameters": []
}
```

2. For example the source:

```book
AI Avatar

PERSONA A friendly AI assistant that helps you with your tasks
META FOO foo
META IMAGE ./picture.png
META BaR bar
META foo foo2
```

2. When passed as argument to `parseAgentSource`, the `parseAgentSource` should return:

```json
{
    "agentName": "AI Avatar",
    "personaDescription": "A friendly AI assistant that helps you with your tasks",
    "meta": {
        "image": "./picture.png",
        "foo": "foo2",
        "bar": "bar"
    },
    "parameters": []
}
```

---

[x]

[✨🐬] Syntax highlighting in `<BookEditor/>` has some false positive highlights

-   Commitments in the middle of the word should not be highlighted
-   It doesnt matter if its uppercase or lowercase, only commitments which are in the beginning of the line are commitments, words with the same name in the middle of the line are not commitments.
-   Update both syntax highlighting and parsing logic to reflect this change
-   Look at existing commitment definitions and highlighting for the reference
-   Reflect this change into the `/CHANGELOG.md`
-   Keep in mind DRY principle, do not repeat yourself.

For example valid commitment `KNOWLEDGE` which should (and is) highlighted:

```book
AI Assistant

KNOWLEDGE Foo
```

For example invalid commitment `KNOWLEDGE` which should NOT be highlighted (but currently it is highlighted):

```book
AI Assistant

Foo bar knowledge baz
```
