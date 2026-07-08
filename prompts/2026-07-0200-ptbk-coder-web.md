[x] ~$1.41 an hour by OpenAI Codex `gpt-5.5`

[✨🍖] Make a website for `ptbk coder`

-   Purpose of the website is to provide a landing page for `ptbk coder` and its features.
-   Target is to show how the `ptbk coder` is working for person who has no idea about it.
    -   But the person can know about Claude Code and OpenAI Codex
-   Get inspiration in similar pages:
    -   https://opencode.ai/
    -   https://kilo.ai/
    -   https://cline.bot/
    -   https://openai.com/cs-CZ/codex/
    -   https://claude.com/product/claude-code
    -   https://cursor.com/get-started
-   Page should be in English and Dark mode
-   Page should show the code to terminal from the installation to the advanced features
-   The typical visitor and user is a developer who wants to use `ptbk coder` to code and develop software with the help of AI agents.
-   The landing page should be based on Next.js
    -   Look how other apps in `/apps` are made
-   In the app make the folder `specs` _(I mean `apps/coder-landing/specs`)_
    -   Purpose of the specs is to have a single source of truth for the functionality of the page, so that it can be used for development, testing, and documentation but also for 1:1 replication of the functionality without having the source code of the page
    -   When I take just specs folder it should be possible to implement the same functionality of the page without having the source code of the page
    -   Specs will be created in the `specs/` folder in the root of the repository
    -   Use hierarchy of folders to organize the specs, for example `specs/foo/bar.md`
    -   One markdown file should contain one spec / reponsibility / aspect of the page, so that it can be easily referenced and linked to from other specs
    -   The most important specs and most abstract and core concepts should be in the root of the `specs/` folder, and less important specs should be in subfolders
    -   Interlink the specs via markdown hyperlinks
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality of `ptbk coder` before you start implementing.
-   You are working with [`ptbk coder`](src/cli/cli-commands/coder/run.ts) but not changing its code, just creating a landing page for it.

```bash
npm install ptbk

ptbk coder init

ptbk coder server --harness claude-code --model fable --thinking-level max --agent agents/coding/developer.book --context AGENTS.md --test npm run test-for-ptbk-coder
```

