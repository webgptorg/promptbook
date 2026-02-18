[ ]

[✨🥱] Refactor [`import-github.ts` file](scripts/import-github/import-github.ts)

-   The file is dense enough that it is hard to follow.
-   The file defines too many responsibilities (12 in single file)
    -   Keep in mind the Single Responsibility Principle (SRP)
    -   Consider breaking it down into smaller, focused modules or components.
-   Purpose of this refactoring is to improve code maintainability and readability.
-   Look at the internal structure, the usage and also surrounding code to understand how to best refactor this file.
-   Consider breaking down large functions into smaller, more manageable ones, removing any redundant code, and ensuring that the file adheres to the project coding standards.
-   After the refactoring, ensure that (1) `npm run test-name-discrepancies` and (2) `npm run test-package-generation` are passing successfully.
    1. All the things you have moved to new files should correspond the thing in the file with the file name, for example `MyComponent.tsx` should export `MyComponent`.
    2. All the things you have moved to new files but are private things to the outside world should have `@private function of TheMainThing` JSDoc comment.
-   Keep in mind DRY _(Do not repeat yourself)_ and SOLID principles while refactoring.
-   **Do not change the external behavior** of the code. Focus solely on improving the internal structure and organization of the code.
