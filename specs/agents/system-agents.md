# System agents

[Agents](_index.md)

System agents exist as engine-defined references without project files. They must not be materialized as core agents, edited as local Books or shadowed by a project agent's normalized name.

This is the product term replacing "non-agents". Distinguish ordinary content agents, engine-prepared but project-owned core agents and engine-owned system agents. These describe definition ownership; they do not create three incompatible agent protocols or imply that every built-in reference makes an LLM call.

| Reference | FROM | TEAM |
| --- | --- | --- |
| `@Void`, alias `@Null` (also the legacy `0`) | Ends inheritance; supplies no instructions. | Valid no-op; no consultation or error. |
| `@User` | Invalid; inheritance must fail with a clear diagnostic. | Starts or continues a durable human-facing chat for the required question or action. |
| `@Expert` | Supplies Promptbook expertise from the running engine. | Consults that runtime's Promptbook expert. |

The brace forms `{Void}`, `{Null}`, `{User}` and `{Expert}` are the same references. These built-ins are checked before any project file, as the first tier of [resolution](../book-language/references.md#ordered-resolution).

Void and User are special semantics, not ordinary model-backed roles. In particular, User is not a selectable conversational agent chatting with itself. Expert does behave like a knowledgeable agent, but its definition and runtime context belong to the engine. It may internally share Book mechanisms; no internal representation is prescribed.

See [Expert](expert.md), [references](../book-language/references.md) and [user requests](../cli/user-interactions.md).
