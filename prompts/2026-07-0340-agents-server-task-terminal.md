[.] !!!!!

[✨😉] In the task manager, allow to see the full CLI terminal of each particular task in real time

-   Now there is just simple post-mortem log of the task, but it is not possible to see the full CLI terminal of each particular task in real time, so you cannot see what is happening in the task in real time.
-   Allow to see both the post-mortem log of the task _(with buttons to download and copy the log)_ and also add button to open the full CLI terminal of each particular task in real time, so that you can see what is happening in the task in real time.
-   The terminal is read-only, you cannot type into it, but you can see the full CLI terminal of each particular task in real time as it is running, so that you can see what is happening in the task in real time.
-   Show only the terminal of the task, not the whole Agents server terminal
-   This should be available for all types of tasks
-   Only super-admin users can see the full CLI terminal
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server) with `/admin/task-manager`

![alt text](screenshots/2026-07-0340-agents-server-foo.png)
