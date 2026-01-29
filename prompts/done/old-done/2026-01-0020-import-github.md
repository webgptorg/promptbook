[x]

[✨♓️] Create a script that can import GitHub discussions and issues.

-   Use GitHub API to fetch issues and discussions from a [Promptbook repository](https://github.com/webgptorg/promptbook).
-   Structure the imported data into Markdown files.
-   For issues, include the title, body, labels, and comments.
-   For discussions, include the title, body, category, and comments.
-   Format the content properly using Markdown syntax.
-   Ensure that code snippets, links, and other formatting from the original GitHub content are preserved in the Markdown files.
-   Organize the files in a clear directory structure based on their type (issues or discussions) and possibly by labels or categories.
-   Use appropriate filenames that reflect the content, such as using the issue or discussion number and title.
-   Handle pagination if there are many issues or discussions to ensure all content is retrieved.
-   Include metadata at the top of each Markdown file, such as the author, date created, and last updated.
-   Implement error handling to manage API rate limits and potential data retrieval issues.
-   Place everything into /documents/github
    -   [Issues](/documents/github/issues)
    -   [Discussions](/documents/github/discussions)
-   The script should be under /scripts and added to the `package.json` and `/.vscode/terminals.json` scripts section for easy execution.
-   Purpose of this script is to periodically backup the discussions and issues directly into the repository.
-   Script can be executed multiple times. It should work perfectly when run multiple times and update only changed or new issues/discussions.
-   Look how other scripts are implemented. Reuse the structure.
-   Add flag `--commit` to autocommit the changes after script is done. Look at the other scripts how this feature is implemented elsewhere.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.

---

[-]

[✨♓️] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨♓️] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`

---

[-]

[✨♓️] baz

-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Add the changes into the `/changelog/_current-preversion.md`
