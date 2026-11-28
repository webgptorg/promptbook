[x] ~$1.21

[✨🤨] Refactor [`Chat` files](src/book-components/Chat/)

-   Refactor the Chat component
-   The files mixes multiple concerns, making it harder to follow, one file should have one responsibility.
-   Some files contains excessive lines of code (2049 lines), exceeding the 500-line guideline.
-   The file defines too many top-level entities (10 vs 4 allowed), increasing cognitive load.
-   Look at the internal structure, the usage and also surrounding code to understand how to best refactor this file.
-   Keep in mind that the purpose of this refactoring is to improve code maintainability and readability.
-   Consider breaking down large functions into smaller, more manageable ones, removing any redundant code, and ensuring that the file adheres to the project coding standards.
-   Keep in mind DRY (Do not repeat yourself) and SOLID principles while refactoring.
-   **DO NOT change the external behavior** of the code. Focus solely on improving the internal structure and organization of the code.

