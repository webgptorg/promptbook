[ ]

[✨🈸] Refactor [`linguisticHash.ts` file](src/utils/linguistic-hash/linguisticHash.ts) and its subfunctions

-   Target file: `src/utils/linguistic-hash/linguisticHash.ts`
-   The file is dense enough that it is hard to follow.
-   The file defines too many top-level entities (7 vs 4 allowed), increasing cognitive load.
-   Look at the internal structure, the usage and also surrounding code to understand how to best refactor this file.
-   Keep in mind that the purpose of this refactoring is to improve code maintainability and readability.
-   Consider breaking down large functions into smaller, more manageable ones, removing any redundant code, and ensuring that the file adheres to the project coding standards.
-   Keep in mind DRY (Do not repeat yourself) and SOLID principles while refactoring.
-   DO NOT change the external behavior of the code. Focus solely on improving the internal structure and organization of the code.
