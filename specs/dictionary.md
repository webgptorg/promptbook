## Commitments


Commitments are basic syntax elements that add specific functionalities to AI agents written in `book` language.

-   They are used in `agentSource`, there are commitments like `GOAL`, `RULE`, `KNOWLEDGE`, `USE CALENDAR`, `USE PROJECT`, `META IMAGE`, `CLOSED`, etc.
-   They are in the folder `src/commitments`.
-   Each commitment starts with a keyword, e.g. `GOAL`, `KNOWLEDGE`, `USE PROJECT`, etc. on a beginning of the line and ends by a new commitment or the end of the book.
-   There is a general pattern that the commitment keyword is followed by a space and then by the content of the commitment, for example:
    -   `GOAL You are a helpful assistant that helps with cooking recipes.`
    -   `USE MCP https://mcp.example.com/server`
-   In the commitment context, you can reference external agents, for example:
    -   `TEAM You can talk to {Criminal lawyer} and {Financial advisor}`
