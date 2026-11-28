[-]

[✨👧] brr

```console
hejny@Pavols-MacBook-Air aldaron % npx ptbk coder verify --order from-latest --ignore Refactor --commit --auto-pull --auto-push

...

- Across the administration, there are multiple tables which are not shown fully because they have a very big width. But there is no horizontal scroll bar, or the horizontal scroll bar is on the bottom of the table.
- The horizontal scroll bar should be always fixed on the bottom of the table, and it should be always visible. even when the user scrolls down the page.
- The solution should be implemented in a reusable way, so it can be applied to all tables in the admin.
- Try to smartly pin the most important column of the table in some smart way, for example, the name of the person or shortcode from the shortener should be visible always.
- You are working with pa…
? Is prompts/2026-08-0601-scrolling-in-admin.md#1 actually done? › - Use arrow-keys. Return to submit.
    ✅ Yes, it's done
    ❌ No, needs work
❯   ⏩ Skip, do nothing
```

-   @@@@@@@
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` and related functionality before you start implementing.
-   Also look and update [the dev scripts in `terminals.json`](.vscode/terminals.json)
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts)
-   Update the [`ptbk coder` landing website](apps/coder-landing)
-   Add the changes into the [changelog](changelog/_current-preversion.md)