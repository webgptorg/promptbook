[-]

[✨🍊] When running `npx ptbk` it fails BUT `npx ptbk --help` or `npx ptbk about` are not failing

-   It fails on strange error: `Cannot read properties of undefined (reading 'includes')`
-   The `npx ptbk` should be alias for `npx ptbk --help`
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

```bash
Windows PowerShell
Copyright (C) Microsoft Corporation. All rights reserved.

Try the new cross-platform PowerShell https://aka.ms/pscore6

Warning: PowerShell detected that you might be using a screen reader and has disabled PSReadLine for compatibility purposes. If you want to re-enable it, run 'Import-Module PSReadLine'.

PS C:\Users\me> npx ptbk
npm warn cli npm v10.9.1 does not support Node.js v18.4.0. This version of npm supports the following node versions: `^18.17.0 || >=20.5.0`. You can find the latest version at https://nodejs.org/.
Need to install the following packages:
ptbk@0.103.0-31
Ok to proceed? (y) y

npm warn deprecated multer@1.4.5-lts.2: Multer 1.x is impacted by a number of vulnerabilities, which have been patched in 2.x. You should upgrade to the latest 2.x version.
npm warn deprecated @azure/openai@1.0.0-beta.13: The Azure OpenAI client library for JavaScript beta has been retired. Please migrate to the stable OpenAI SDK for JavaScript using the migration guide: https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/openai/openai/MIGRATION.md.
Cannot read properties of undefined (reading 'includes')
PS C:\Users\me> npx ptbk about
npm warn cli npm v10.9.1 does not support Node.js v18.4.0. This version of npm supports the following node versions: `^18.17.0 || >=20.5.0`. You can find the latest version at https://nodejs.org/.
Promptbook: Turn your company's scattered knowledge into AI ready books
Book language version: 1.0.0
Promptbook engine version: 0.103.0-31
Environment: Node.js
Node.js version: v18.4.0
Platform type: win32
Platform architecture: x64
https://github.com/webgptorg/promptbook
https://ptbk.io
PS C:\Users\me> npx ptbk --help
npm warn cli npm v10.9.1 does not support Node.js v18.4.0. This version of npm supports the following node versions: `^18.17.0 || >=20.5.0`. You can find the latest version at https://nodejs.org/.
Usage: promptbook|ptbk [options] [command]

Turn your company's scattered knowledge into AI ready books

Options:
  -V, --version                           output the version number
  -h, --help                              display help for command

Commands:
  about [options]                         Tells about Promptbook CLI and its abilities
  run|execute [options] [pipelineSource]  Runs a pipeline
  login [options]                         Login to the remote Promptbook server
  hello|hi [options] [name]               Just command for testing
  make|compile [options] [path]           Makes a new pipeline collection in given folder
  prettify [options] <filesGlob>          Iterates over `.book.md` files and does multiple enhancing operations on them:

                                          1) Adds Mermaid graph
                                          2) Prettifies the markdown
  test [options] <filesGlob>              Iterates over `.book.md` and `.bookc` and checks if they are parsable and logically valid
  list-models|models [options]            List all available and configured LLM models
  list-scrapers|scrapers [options]        List all available and configured scrapers and executables
  start-server|server [options] [path]    Starts a remote server to execute books
  help [command]                          display help for command
PS C:\Users\me>
```

![alt text](screenshots/2025-10-0220-fix-type-error.png)

---

[-]

[✨🍊] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[-]

[✨🍊] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`

---

[-]

[✨🍊] qux

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `CHANGELOG.md`
