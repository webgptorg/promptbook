[ ]

[✨🎸] Add projects to Agents server


```book
Developer

GOAL Your goal is to maintain @Project1 and {Project2 Server}

USE PROJECT @Project1
USE PROJECT {Project2 Server}
TEAM Consult your work with @Lawyer and {Frontend Developer} before you start implementing. They will help you to avoid mistakes and save time.
```

-   Alongside agents, create a projects
- Identification pool of Agents and projects is same - names are unique across the system
    - For example, reference @Foo or {Foo} can be used to reference both an Agent and a Project
    - When an Agent is referenced where the project is expected or vice versa, the system show error in similar way as when an non-existing Agent is referenced
- In the Age
- Project can be assigned to the Agent by using `USE PROJECT` commitment
-   Keep in mind the DRY _(don't repeat yourself)_ principle.
-   Do a proper analysis of the current functionality before you start implementing.
-   You are working with the [Agents Server](apps/agents-server)
-   If you need to do the database migration, do it
-   Add the changes into the [changelog](changelog/_current-preversion.md)
- 11:11