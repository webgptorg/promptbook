# Book language

[Main specification](_main.md) · [Dictionary](dictionary.md)

Book is the human-readable language used by Promptbook documents. The coder distinguishes two document types that share lexical infrastructure and have different semantics and runtimes:

- **Agent Book**: A reusable role: persona, rules, knowledge, inheritance and advisors. See [Agent context](coder/agent-context.md), [TEAM](coder/team.md).
- **Task Book**: One work definition: identity, status, priority, routing, payload and triggers. A header TASK declares this document type. See [Task Books](coder/task-books.md), [not-before](coder/not-before.md), [recurrence](coder/recurrence.md).

A task Book is not compiled as an agent, does not inherit Adam automatically and does not create a chat profile. Agent Books without the TASK header remain agent Books. A commitment keyword shared by both dialects must be interpreted using the document type; task MODEL and META ID have the task meanings defined in the task contract.

The older server specification is preserved as [historical agent syntax](deprecated/book-language.md), [commitment registry](deprecated/commitment-registry.md), [compilation](deprecated/agent-compilation.md) and [generated documentation](deprecated/book-documentation.md). Their existing lower-authority warning is retained. Historical server APIs and permissive agent parsing must not override the strict task parser.
