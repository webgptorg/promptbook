# Promptbook vs Claude

Claude is a family of large language models developed by Anthropic, designed to be helpful, honest, and harmless. Claude is known for its strong reasoning capabilities, long context window, and articulate writing style. Anthropic also provides "Projects" and "Artifacts" to enhance the developer experience.

While Claude excels at processing large amounts of information and maintaining a consistent tone, it is primarily a model-centric product. Promptbook, on the other hand, provides an agent-centric abstraction that allows developers to define persistent personas and rules that remain consistent regardless of the underlying model version. In professional environments, Claude's "Constitutional AI" can sometimes be too restrictive or unpredictable, a problem Promptbook addresses with explicit, auditable **Commitments**.

## Side-by-Side Comparison

| Promptbook                                                                          | Claude                                                                 |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| ✔ **Persistent Agent Identity**: Decoupled from the specific model version.        | ✘ **Model-Specific**: Behavior is tied to the version (e.g., 3.5 Sonnet). |
| ✔ **Multi-Model Support**: Switch between OpenAI, Anthropic, and others easily.    | ✘ **Ecosystem Locked**: Optimized for Anthropic's own infrastructure.  |
| ✔ **Strict Behavioral Constraints**: `RULE` commitment ensures compliance.         | ✘ **Soft Alignment**: Relies on "Constitutional AI" which can be bypassed. |
| ✔ **Structured Agent Definitions**: Written in `.book` format for portability.      | ✘ **Ad-hoc Configuration**: Personas are defined via system prompts.   |
| ✔ **External Knowledge Integration**: Native `KNOWLEDGE` commitment for RAG.       | ✘ **Context Window Reliance**: Often relies on massive context windows. |
| ✔ **Auditable Commitments**: Rules are verifiable and can be tested via adversaries. | ✘ **Black Box**: Alignment logic is internal and not easily customized. |
| 💡 **Agent Abstraction**: Focuses on *who* the AI is and *what* it must do.        | 💡 **Model Power**: Focuses on the raw intelligence and window size. |

**Best for:** Building professional AI agents with long-term stability, strict rules, and cross-provider flexibility. | **Best for:** Complex reasoning, creative writing, and processing very large documents within a single session.
