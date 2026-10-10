# Agents

[Main specification](../_main.md) · [Book language](../book-language/_index.md)

An agent is a persistent role, goal, rules and knowledge, not a permanently running model call. A task is a bounded piece of work. Many agents can belong to one project while only one project task executes at a time.

Project agents are editable Books under `agents/`. Core agents are editable Books that the engine ensures exist under `agents/.core/`. Non-agents are special references supplied by the engine, not project files.

- [Core agents](core-agents.md): Adam, Manager and Teacher.
- [Non-agents](non-agents.md): Void/Null, User and Expert.
- [Manager](manager.md): Automatic assignment.
- [Teacher](teacher.md) and [learning](learning.md): Controlled improvements after work.
- [Expert](expert.md): Knowledge of the running Promptbook engine.
- [Consistency](consistency.md): Reserved identities and recursion safeguards.

The first nonempty line of a Book is the agent's name. Names are unique after [normalization](../book-language/references.md); file organization does not define identity. [FROM](../book-language/commitments/from.md) supplies inheritance; [TEAM](../book-language/commitments/team.md) describes whom to consult and when. They are different relationships.
