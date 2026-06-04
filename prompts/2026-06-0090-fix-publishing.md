[ ] !!!!!!

[✨🐕] Fix package publishing

Error: Things marked with [🔵] should never be never released out of @promptbook/browser

**Steps to fix the issue:**

1. Look why the marker [🔵] is in the released `@promptbook/browser` bundle
2. Analyze the import chain which leads to usage outside of the browser package
3. Fix the issue:
   A) If the code is indeed browser-only, fix the consuming code
   B) If the code has some browser-only parts but is not fully browser-only, consider splitting it into separate files and marking only the truly browser-only code with [🔵]
   C) If the code is accidentally marked as browser-only, remove the [🔵] marker from the source code

Note: Purpose of this mechanism is to prevent accidental leaks of browser-only code into packages that could be imported into Node environments
For example, if we accidentally import `window` into a package that is not marked as browser-only, it could cause runtime errors when someone tries to use that package in Node environment
There are equivalent checks for Node-only code leaking into browser-importable packages

**Regardless of the specific fix, make sure to:**

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start refactoring and fixing the issue.- Add the changes into the [changelog](changelog/_current-preversion.md)

./packages/cli/src/dialogs/simple-prompt/SimplePromptInterfaceTools.ts
In line 51:
// Note: [🔵] Code for browser dialog helper [SimplePromptInterfaceTools](src/dialogs/simple-prompt/SimplePromptInterfaceTools.ts) should never be published outside of `@promptbook/browser`
