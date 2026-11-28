[x][-][-]

[✨☂️] Cleanup unused functions and classes

-   Go through the codebase and identify any functions or classes that are no longer used.
-   You are looking into `src` folder
-   There are 3 types of entities (functions and classes) to cleanup:
    1. Entities that are exported to some `@promptbook/*` package
    2. Entities that are used only internally inside the project
    3. Entities that are not used at all
-   You are cleaning up only the 3rd type of entities - entities that are not used at all
-   Do not ask me any questions, just analyze the codebase and cleanup unused entities
-   List the removed entities in the `CHANGELOG.md`
