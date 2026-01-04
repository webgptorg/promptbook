[x]

[✨⏳] Allow to import generic text files.

-   Implement commitment `IMPORT` that allows to import generic text files into the agent source.
-   Now you can import only another agent source books.
-   Allow to import generic text which will be placed on where the import is.
-   Import can have both URL and local file. For example
    -   `IMPORT https://Determine the code block. example.com/some-text-file.txt`
    -   `IMPORT ./path/to/local-file.txt`
-   When the agent source book is imported, do the processing like stripping the agent name and bringing there only the agent corpus. On the other hand, when you are importing generic text file, just bring 1:1 exact contents of this file at the place of the import.
-   Wrap the imported file into the code block when placing the imported file into the book, for example:

```book
AI Agent

PERSONA You are writing poems
USER MESSAGE Napiš mi báseň o jaru.
AGENT MESSAGE
IMPORT https://example.com/some-poem.txt

```

**Will result into:**

```book
AI Agent

PERSONA You are writing poems
USER MESSAGE Napiš mi báseň o jaru.
AGENT MESSAGE
\`\`\`txt
Jaro je tady,
slunce svítí jasně,
květiny kvetou,
všude je krásně.
\`\`\`

```

-   Determine the code block type from the MIME type, not from the extension. Use the extension only for local files.
-   When you are importing JSONs, do the formatting before placing them there.
-   Do some mocked security checks of the imported files. Later, the security check will be implemented properly. The security check is asynchronous.
-   The system of handling multiple files should be plug-in architecture. Allow very easily to extend to support another type of file.
-   When the file isn't supported or listed in the import plugins, do not allow to import.
-   Look across the repository how the plugin systems are implemented. For example, like how the plugin system of LLM Execution Tools is implemented or how the plugins of the scrapers are implemented. Do it in a similar way.
-   Prevent importing binary files. Allow to import any text file like.txt,.json, or some code, but avoid to import, for example, images for now.
-   The `FROM`commitment stays unchanged, it can be used only for importing another agent source books
-   It should work for example with the `Agents Server` application `/apps/agents-server`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

**Context:**

-   **Commitments** are basic syntax elements that add specific functionalities to AI agents
    -   They are used in `agentSource`, there are commitments like `PERSONA`, `RULE`, `KNOWLEDGE`, `USE BROWSER`, `USE SEARCH ENGINE`, `META IMAGE`, etc.
    -   Commitments are in the folder `/src/commitments`
    -   Each commitment starts with a keyword, e.g., `KNOWLEDGE`, `USE BROWSER`, etc. on a begining of the line and end by new co
    -   Agent source with commitments is parsed by two functions:
        -   `parseAgentSource` which is a lightweight parser for agent source, it parses basic information and its purpose is to be quick and synchronous. The commitments there are hardcoded.
        -   `createAgentModelRequirements` which is an asynchronous function that creates model requirements it applies each commitment one by one and works asynchronously.

---

[-]

[✨⏳] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨⏳] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨⏳] foo

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
