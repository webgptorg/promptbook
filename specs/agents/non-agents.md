# Non-agents

[Agents](_index.md)

Non-agents exist as engine-defined references without project files. They must not be materialized as core agents, edited as local Books or shadowed by a project agent's normalized name.

| Reference | FROM | TEAM |
| --- | --- | --- |
| Void, alias Null (also `0`) | Ends inheritance; supplies no instructions. | Valid no-op; no consultation or error. |
| User | Invalid; inheritance must fail with a clear diagnostic. | Consults the user through the general request mechanism. |
| Expert | Supplies Promptbook expertise from the running engine. | Consults that runtime's Promptbook expert. |

Void and User are special semantics, not ordinary model-backed roles. Expert does behave like a knowledgeable agent, but its definition and runtime context belong to the engine. It may internally share Book mechanisms; no internal representation is prescribed.

See [Expert](expert.md), [references](../book-language/references.md) and [user requests](../cli/user-interactions.md).
