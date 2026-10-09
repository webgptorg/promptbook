## How to Contribute

-   **Add changes in [Changelog](changelog/_current-preversion.md)**
-   **Test are run automatically** after your work is performed and before the work is commited. But if you want to run them manually, look at `package.json` scripts for all available test commands.
-   **DO NOT commit your changes** changes you make will go through the automatic testing and committing process after you finish your work.

## Dictionary

Look at [dictionary of the terms](specs/dictionary.md)

## Common rules

-   Always analyze the context and requirements before generating any code.
-   Write clear, maintainable, and well-documented code.
-   Write JSDoc comments for all entities - functions, classes, types, top-level constants, etc.
    -   When this entity is exported from the file and it is under `src` folder _(not for example in the `apps` folder)_, it must be marked either as `@public` or `@private` at the end of the JSDoc comment.
    -   For example: "@private internal utility of <Chat/>" / "@public exported from `@promptbook/browser`"
    -   If you don't know, prefer to mark it as private, we can always change it to public later, but changing from public to private may cause breaking changes.
-   You (the AI coding agent) are running inside a Node process, so do not kill all Node processes such as `taskkill /F /IM node.exe`. If you need to stop something you spawned, kill only that specific process, for example by PID or by port.

## Additional context

-   Look at attached images if there are present
-   Attached images are in folder `prompts` on the root of the project
    -   For example the ![alt text](screenshots/foo.png) is image file `prompts/screenshots/foo.png`
