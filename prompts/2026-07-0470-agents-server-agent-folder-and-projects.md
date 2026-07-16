[x] (2 attempts) $3.92 4 hours by Claude Code `fable`

---

[ ] !!!!!!!!!!

[✨🏖] Every agent should have its own folder for his projects.

-   Purpose of this change is to give every agent its own isolated environment where they can do their work and have their own persistent data, like files, scripts, and other project-related information.
-   Agent server can have multiple agents, each agent can have multiple projects, and each project has its own directory on the agent server
-   Projects are linked to the Agent, not to the entire Agent server or user. Every Agent can have multiple projects.
-   The project is based on one folder which the agent has access to and has 100% control over. The agent can read and write files in this folder, run batch scripts, and do whatever he wants with the files in this folder.
-   The agent can have multiple projects
-   Allow admin to see all the projects of all the agents and their folders.
-   The instructions how the projects work should have every harness in its prompt
-   Purpose of this is to be able to tell the agent to make some website or do some work, and the agent can create or modify a project for it.
-   Agent can also link the project or any file from any project into the chat.
-   Each project can be a git repository.
-   The agent should be able to reference the project in the chat
-   Add "Projects" dashboard for each agent in the context menu of the agent ![alt text](screenshots/2026-07-0470-agents-server-agent-folder-and-projects.png)
-   There should be a "Projects" dashboard for the particular agent
-   Also create a dashboard for the admin to see all the projects of all the agents and their folders.
-   Reuse the components and code of theese two dashboards and interlink them
-   Also, add to the resource monitor the size of projects of each agent and the total size of all projects of each agent alongside the disk space of the agent server.
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   Add the changes into the [changelog](changelog/_current-preversion.md)
