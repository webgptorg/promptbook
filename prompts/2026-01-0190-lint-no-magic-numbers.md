[x]

[✨🌞] Add the lint rule [no magic numbers](https://eslint.org/docs/latest/rules/no-magic-numbers) into the link thing of the entire project.

-   Add it both to `/` and `/apps/agents-server` ESLint configurations.
-   Configure it to allow common numbers like 0, 1, -1, 100, etc., but disallow other magic numbers in the code.
-   Keep in mind the DRY _(don't repeat yourself)_ principle. Semantically distinct the values. When the number is the same, put it only once in the configuration. When the value means something different, put it twice.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[ ]

[✨🌞] You have added [no magic numbers](https://eslint.org/docs/latest/rules/no-magic-numbers) linting rule but not fixed the problems

-   Fix the problems which are shown by this linting rule in:
    -   `/` project, ignore generated files, for example `getTemplatesPipelineCollection.ts` contains vector embeddings dimensions but make no sense to explain or to apply the rule there.
    -   `/apps/agents-server` all the problems.
    -   Also do not apply (ignore) the rule for svg images, UI dimensions, etc., only for the actual logic code.
-   Fix all the problems which are shown by this linting rule in both `/` and `/apps/agents-server` projects.
-   Group semantically distinct numbers into /src/constants.ts for both / and /apps/agents-server
-   Each value must have its jsdoc comment explaining what it is.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
