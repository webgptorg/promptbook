[ ]

[✨🌞] Add the lint rule [no magic numbers](https://eslint.org/docs/latest/rules/no-magic-numbers) into the link thing of the entire project.

-   Add it both to `/` and `/apps/agents-server` ESLint configurations.
-   Configure it to allow common numbers like 0, 1, -1, 100, etc., but disallow other magic numbers in the code.
-   Keep in mind the DRY _(don't repeat yourself)_ principle. Semantically distinct the values. When the number is the same, put it only once in the configuration. When the value means something different, put it twice.
-   Add the changes into the `/changelog/_current-preversion.md`
