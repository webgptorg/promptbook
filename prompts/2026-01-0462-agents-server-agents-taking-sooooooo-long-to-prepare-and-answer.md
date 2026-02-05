[ ] !

[✨📰] Create script that will batch delete all the OpenAI GPT assistants

-   Take environment variable `OPENAI_API_KEY` for authentication.
-   First list all the assistants using the OpenAI API and show their count.
-   Show the user the summary of assistants to be deleted and ask for confirmation.
-   Then delete them one by one using the OpenAI API (but no ask for confirmation for each, just log).
-   Handle pagination if there are many assistants.
-   Look at `scripts` folder
-   Add it into `.vscode/terminals.json`
